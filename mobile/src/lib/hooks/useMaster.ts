import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MasterData } from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { masterService } from "../services/master";
import { useAuthStore } from "../stores/auth";

/**
 * マスターデータ取得フック
 *
 * - 初回: サーバーから取得してローカルキャッシュ
 * - 2回目以降: サーバー側でバージョンチェック
 *   - 最新版: ローカルデータ使用
 *   - 更新あり: 全データ取得
 * - オフライン: ローカルキャッシュで動作
 *
 * ⚠️ 認証完了後（isReady: true）のみ実行
 * トークンが必要なため、Auth 初期化を待つ
 *
 * @param enabled - クエリの有効化フラグ（デフォルト: true）
 */
export function useMaster(enabled: boolean = true) {
  const { isReady } = useAuthStore();

  const query = useQuery<MasterData>({
    queryKey: ["masters"],
    queryFn: async () => {
      logWithContext("info", "[useMaster] Loading master data");
      return await masterService.getMasterData();
    },
    enabled: enabled && isReady, // Auth 初期化完了まで待機
    staleTime: Infinity, // マスターデータは頻繁に変更されないため
    gcTime: Infinity, // キャッシュは永続的に保持
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true, // ネットワーク再接続時はバージョンチェック
  });

  return {
    // 状態
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSuccess: query.isSuccess,

    // データ
    masterData: query.data || null,
    decks: query.data?.decks || [],
    spreads: query.data?.spreads || [],
    categories: query.data?.categories || [],
    levels: query.data?.levels || [],
    plans: query.data?.plans || [],
    tarotists: query.data?.tarotists || [],
    version: query.data?.version || null,

    // ReactQuery の機能
    refetch: query.refetch,
  };
}

/**
 * マスターデータ強制更新フック
 * 設定画面などから手動更新する場合に使用
 */
export function useRefreshMaster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      logWithContext("info", "[useRefreshMaster] Force refresh triggered");
      return await masterService.getMasterData(true);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["masters"], data);

      const totalCards = data.decks.reduce(
        (sum, deck) => sum + (deck.cards?.length || 0),
        0
      );

      logWithContext("info", "[useRefreshMaster] Refresh successful", {
        version: data.version,
        decksCount: data.decks?.length || 0,
        totalCards,
        spreadsCount: data.spreads?.length || 0,
      });
    },
    onError: (error) => {
      logWithContext("error", "[useRefreshMaster] Refresh failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });
}

/**
 * マスターデータバージョンチェックフック
 * サーバーに新しいバージョンがあるか確認
 */
export function useCheckMasterVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const currentData = queryClient.getQueryData<MasterData>(["masters"]);
      const localVersion = currentData?.version || "0";

      // checkUpdate を使用（POST /api/masters/check-update）
      const response = await masterService["checkUpdate"](localVersion);

      return {
        localVersion,
        serverVersion: response.latestVersion,
        needsUpdate: response.needsUpdate,
      };
    },
    onSuccess: (result) => {
      logWithContext(
        "info",
        "[useCheckMasterVersion] Version check complete",
        result
      );
    },
    onError: (error) => {
      logWithContext("error", "[useCheckMasterVersion] Version check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });
}

/**
 * ローカルキャッシュクリアフック（デバッグ用）
 * 開発時やトラブルシューティングで使用
 */
export function useClearMaster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await masterService.clearLocalData();
      queryClient.removeQueries({ queryKey: ["masters"] });
    },
    onSuccess: () => {
      logWithContext("info", "[useClearMaster] Master data cleared");
    },
    onError: (error) => {
      logWithContext("error", "[useClearMaster] Failed to clear", {
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });
}
