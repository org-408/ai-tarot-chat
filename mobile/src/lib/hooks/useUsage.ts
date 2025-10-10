import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UsageStats } from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { clientService } from "../services/client";
import { useAuthStore } from "../stores/auth";

/**
 * Usage取得フック（ReactQuery版）
 *
 * 【重要な設計判断】
 * - 課金制限があるため、オフライン使用は許可しない
 * - サーバー側で日次チェック・リセットを実行
 * - ローカル永続化はせず、常にサーバーの真実を取得
 * - 不正防止（ローカル改ざん対策）
 *
 * ⚠️ 認証完了後（isReady: true）のみ実行
 * トークンが必要なため、Auth 初期化を待つ
 * ゲストユーザーも含めて全員トークン必須
 *
 * @param enabled - クエリの有効化フラグ（認証済みの場合のみtrue）
 */
export function useUsage(enabled: boolean = true) {
  const { isReady, payload } = useAuthStore();
  const clientId = payload?.clientId || null;

  // Usage取得（Auth初期化完了 かつ clientId が存在する場合のみ実行）
  const query = useQuery<UsageStats>({
    queryKey: ["usage", clientId],
    queryFn: async () => {
      if (!clientId) {
        throw new Error("ClientId is required to fetch usage");
      }
      logWithContext("info", "[useUsage] Fetching usage stats");
      return await clientService.getUsageAndReset();
    },
    enabled: enabled && isReady && !!clientId, // isAuthenticated ではなく isReady
    staleTime: 30 * 1000, // 30秒
    gcTime: 5 * 60 * 1000, // 5分
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    // 状態
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSuccess: query.isSuccess,

    // データ
    usage: query.data || null,

    // 便利なプロパティ（デフォルト値付き）
    planCode: query.data?.planCode || "GUEST",
    isRegistered: query.data?.isRegistered || false,
    remainingReadings: query.data?.remainingReadings || 0,
    remainingCeltics: query.data?.remainingCeltics || 0,
    remainingPersonal: query.data?.remainingPersonal || 0,

    // ReactQuery の機能
    refetch: query.refetch,
  };
}

/**
 * Usage強制更新フック
 * 例: 占い実行後に手動で更新する場合
 */
export function useRefreshUsage() {
  const queryClient = useQueryClient();
  const { payload } = useAuthStore();
  const clientId = payload?.clientId || null;

  return useMutation({
    mutationFn: async () => {
      if (!clientId) {
        throw new Error("ClientId is required to refresh usage");
      }
      logWithContext("info", "[useRefreshUsage] Refreshing usage stats");
      return await clientService.getUsageAndReset();
    },
    onSuccess: (data) => {
      if (clientId) {
        queryClient.setQueryData(["usage", clientId], data);
        logWithContext("info", "[useRefreshUsage] Usage refreshed", {
          remainingReadings: data.remainingReadings,
        });
      }
    },
    onError: (error) => {
      logWithContext("error", "[useRefreshUsage] Refresh failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });
}

/**
 * 楽観的UI更新フック
 * 占い実行前にカウントを減らして、UXを向上させる
 *
 * 【制限ルール】
 * スタンダード:
 *   - reading（ケルト十字以外）: 3回
 *   - celtic（ケルト十字）: 1回
 *   - ❗ 排他的：どちらかを使うと、もう片方は0になる
 *
 * プレミアム:
 *   - reading（全スプレッド、ケルト十字含む）: 3回
 *   - personal: 1回（独立）
 *
 * 【使用例】
 * ```typescript
 * const { decrementUsage } = useOptimisticUsageUpdate();
 * const { refetch } = useUsage();
 * const { planCode } = useClient();
 *
 * const handleReading = async (spreadType: 'reading' | 'celtic' | 'personal') => {
 *   // 1. 楽観的にカウント減少
 *   decrementUsage(spreadType, planCode);
 *
 *   // 2. API呼び出し
 *   await executeTarotReading({ spreadType });
 *
 *   // 3. サーバーから正確な値を取得
 *   await refetch();
 * };
 * ```
 */
export function useOptimisticUsageUpdate() {
  const queryClient = useQueryClient();
  const { payload } = useAuthStore();
  const clientId = payload?.clientId || null;

  /**
   * 使用回数を楽観的に減少
   *
   * @param spreadType - スプレッドタイプ
   * @param planCode - プランコード（GUEST/STANDARD/PREMIUM）
   */
  const decrementUsage = (
    spreadType: "reading" | "celtic" | "personal",
    planCode: string = "GUEST"
  ) => {
    if (!clientId) return;

    queryClient.setQueryData<UsageStats>(["usage", clientId], (old) => {
      if (!old) return old;

      // STANDARD プラン：排他的制限
      if (planCode === "STANDARD") {
        if (spreadType === "reading") {
          // reading を使う → celtic も0に（排他的）
          return {
            ...old,
            remainingReadings: Math.max(0, old.remainingReadings - 1),
            remainingCeltics: 0,
          };
        } else if (spreadType === "celtic") {
          // celtic を使う → reading も0に（排他的）
          return {
            ...old,
            remainingReadings: 0,
            remainingCeltics: Math.max(0, old.remainingCeltics - 1),
          };
        } else if (spreadType === "personal") {
          // personal は独立
          return {
            ...old,
            remainingPersonal: Math.max(0, old.remainingPersonal - 1),
          };
        }
      }

      // PREMIUM プラン：reading（全スプレッド）+ personal（独立）
      if (planCode === "PREMIUM") {
        if (spreadType === "reading" || spreadType === "celtic") {
          // reading/celtic どちらも remainingReadings から消費
          return {
            ...old,
            remainingReadings: Math.max(0, old.remainingReadings - 1),
          };
        } else if (spreadType === "personal") {
          // personal は独立
          return {
            ...old,
            remainingPersonal: Math.max(0, old.remainingPersonal - 1),
          };
        }
      }

      // GUEST プラン：それぞれ独立（デフォルト動作）
      switch (spreadType) {
        case "reading":
          return {
            ...old,
            remainingReadings: Math.max(0, old.remainingReadings - 1),
          };
        case "celtic":
          return {
            ...old,
            remainingCeltics: Math.max(0, old.remainingCeltics - 1),
          };
        case "personal":
          return {
            ...old,
            remainingPersonal: Math.max(0, old.remainingPersonal - 1),
          };
        default:
          return old;
      }
    });

    logWithContext("info", "[useOptimisticUsageUpdate] Decremented usage", {
      spreadType,
      planCode,
    });
  };

  return {
    decrementUsage,
  };
}
