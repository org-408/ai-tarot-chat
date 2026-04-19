import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Plan,
  Reading,
  UsageStats,
} from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";
import { clientService } from "../services/client";
import { getTodayJST } from "../utils/date";
import { useMasterStore } from "./master";

export type PaginationParams = {
  take?: number;
  skip?: number;
  next?: boolean;
  prev?: boolean;
};

interface ClientState {
  // ============================================
  // 利用状況の状態
  // ============================================
  isReady: boolean;
  usage: UsageStats | null;
  lastFetchedDate: string | null;

  // ============================================
  // 占い履歴
  // ============================================
  readings: Reading[];
  readingsTotal: number;
  take: number;
  skip: number;

  // ============================================
  // プラン変更の状態
  // ============================================
  currentPlan: Plan;

  // ============================================
  // エラー状態管理
  // ============================================
  error: Error | null;

  // ============================================
  // アクション: 利用状況・占い履歴管理
  // ============================================
  init: () => Promise<void>;
  setPlan: (plan: Plan) => void; // for lifecycle store
  debugSetPlan: (plan: Plan) => void;
  changePlan: (newPlan: Plan) => Promise<void>;
  refreshUsage: () => Promise<void>;
  checkAndResetIfNeeded: () => Promise<boolean>;
  fetchReadings: (params: PaginationParams) => Promise<void>;
  invalidateReadings: () => void;
  setParams: (params: PaginationParams) => { take: number; skip: number };
  setTake: (take: number) => void;
  setSkip: (skip: number) => void;

  // ============================================
  // リセット
  // ============================================
  reset: () => void;
}

// masterストアからGUESTプラン取得
const guestPlan = useMasterStore
  .getState()
  .masterData.plans.find((p) => p.code === "GUEST");

/**
 * Client Store
 *
 * ユーザー、プラン、利用状況など、クライアントに関する全てを管理
 *
 * 責務:
 * - 利用状況の取得・更新
 * - 日次リセット管理
 * - 楽観的UI更新
 *
 * ⚠️ プラン変更は useLifecycleStore().changePlan() が担当
 */
export const useClientStore = create<ClientState>()(
  persist(
    (set, get) => ({
      // ============================================
      // 初期状態
      // ============================================
      isReady: false,
      currentPlan: guestPlan!,
      usage: null,
      lastFetchedDate: null,
      readings: [],
      readingsTotal: 0,
      take: 20,
      skip: 0,
      error: null,

      // ============================================
      // 初期化
      // ============================================
      init: async () => {
        logWithContext("info", "[ClientStore] Initializing");
        const cachedUsage = get().usage;

        set({
          error: null,
        });

        if (cachedUsage) {
          logWithContext("info", "[ClientStore] Using cached usage during init", {
            planCode: cachedUsage.plan.code,
            remainingReadings: cachedUsage.remainingReadings,
          });
        }

        try {
          // ✅ サーバーから利用状況を取得
          const usage = await clientService.getUsageAndReset();
          const currentPlan = usage.plan;
          const today = getTodayJST();

          // ✅ usage を即座にセット（後続処理が失敗しても usage は確保）
          set({ currentPlan, usage, lastFetchedDate: today });

          await clientService.saveLastFetchedDate(today);

          set({ isReady: true, error: null });

          logWithContext("info", "[ClientStore] Initialized successfully", {
            planCode: currentPlan.code,
            remainingReadings: usage.remainingReadings,
          });
        } catch (error) {
          logWithContext("error", "[ClientStore] Initialization failed", {
            error: error instanceof Error ? error.message : String(error),
          });

          // ネットワーク断などで同期できない場合のみ、キャッシュがあればそれで起動を継続する
          set({
            isReady: !!cachedUsage,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },

      setPlan: (plan: Plan) => {
        logWithContext("info", "[ClientStore] Setting current plan", {
          planCode: plan.code,
        });
        set({ currentPlan: plan });
      },

      debugSetPlan: (plan: Plan) => {
        logWithContext("info", "[ClientStore] Debug plan override", {
          planCode: plan.code,
        });

        const usage = get().usage;
        set({
          currentPlan: plan,
          usage: usage ? { ...usage, plan } : usage,
          error: null,
        });
      },

      // ============================================
      // プラン変更
      // ============================================
      changePlan: async (newPlan: Plan) => {
        set({ error: null });

        logWithContext("info", "[ClientStore] Changing plan", {
          newPlanCode: newPlan.code,
        });

        // usage.plan.code（サーバーと最後に同期した値）で判定する
        // ※ currentPlan は authStore.login() 内の setPlan() で先に書き換わる可能性があるため使わない
        const usagePlanCode = get().usage?.plan?.code ?? "GUEST";

        // 既に同プランなら usage だけ最新化してスキップ（重複呼び出し対策）
        if (usagePlanCode === newPlan.code) {
          logWithContext("info", "[ClientStore] Already on target plan, refreshing usage only", {
            planCode: newPlan.code,
          });
          await get().refreshUsage();
          return;
        }

        // usage.plan が GUEST で、新プランが FREE の場合はサーバーAPIを呼ばず usage だけ再取得
        // ※ exchangeTicket が OAuth 完了時に既にサーバー側で GUEST→FREE 変更済み
        if (usagePlanCode === "GUEST" && newPlan.price === 0) {
          logWithContext(
            "info",
            "[ClientStore] GUEST to FREE plan change, refreshing usage"
          );
          // FREE プランの残回数を反映するため usage をサーバーから再取得し、currentPlan と同時更新
          try {
            const usage = await clientService.getUsageAndReset();
            const today = getTodayJST();
            await clientService.saveLastFetchedDate(today);
            set({ currentPlan: newPlan, usage, lastFetchedDate: today });
          } catch (e) {
            logWithContext("warn", "[ClientStore] Failed to refresh usage after GUEST→FREE", {
              error: e instanceof Error ? e.message : String(e),
            });
          }
          return;
        }

        try {
          // 1. サーバーにプラン変更をリクエスト
          const { success, usage } = await clientService.changePlan(
            newPlan.code
          );
          if (!success || !usage) {
            set({ error: new Error("Server plan change failed") });
            return;
          }

          const today = getTodayJST();

          await clientService.saveLastFetchedDate(today);

          set({ currentPlan: usage.plan, usage, lastFetchedDate: today });

          logWithContext("info", "[ClientStore] Plan changed successfully", {
            planCode: usage.plan.code,
            remainingReadings: usage.remainingReadings,
          });
        } catch (error) {
          logWithContext("error", "[ClientStore] Plan change failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          set({
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },

      // ============================================
      // 利用状況の更新
      // ============================================
      refreshUsage: async () => {
        set({ error: null });

        logWithContext("info", "[ClientStore] Refreshing usage");

        try {
          const usage = await clientService.getUsageAndReset();
          const currentPlan = usage.plan;
          const today = getTodayJST();

          await clientService.saveLastFetchedDate(today);

          set({ currentPlan, usage, lastFetchedDate: today });

          logWithContext("info", "[ClientStore] Usage refreshed", {
            planCode: currentPlan.code,
          });
        } catch (error) {
          logWithContext("error", "[ClientStore] Failed to refresh usage", {
            error: error instanceof Error ? error.message : String(error),
          });
          set({
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },

      // ============================================
      // 日付チェック & リセット
      // ============================================
      checkAndResetIfNeeded: async () => {
        set({ error: null });

        logWithContext("info", "[ClientStore] Checking date change");

        try {
          const lastDate = await clientService.getLastFetchedDate();
          const today = getTodayJST();

          if (lastDate === today) {
            logWithContext("info", "[ClientStore] Same day, no reset needed");
            set({ error: null });
            return false;
          }

          logWithContext(
            "info",
            "[ClientStore] Date changed, resetting limits"
          );

          const usage = await clientService.getUsageAndReset();
          const currentPlan = usage.plan;

          await clientService.saveLastFetchedDate(today);

          set({ currentPlan, usage, lastFetchedDate: today });

          logWithContext("info", "[ClientStore] Limits reset", {
            remainingReadings: usage.remainingReadings,
          });

          return true;
        } catch (error) {
          logWithContext("error", "[ClientStore] Date check failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          set({
            error: error instanceof Error ? error : new Error(String(error)),
          });
          return false;
        }
      },

      // ============================================
      // 占い履歴の取得
      // ============================================
      fetchReadings: async (params: PaginationParams) => {
        set({ error: null });

        // parameter 管理
        const { take, skip } = get().setParams(params);

        logWithContext("info", "[ClientStore] Fetching readings", {
          take,
          skip,
        });

        try {
          const { readings: fetchedReadings, total } =
            await clientService.getReadingHistory(take, skip);
          logWithContext("info", "[ClientStore] Readings fetched", {
            count: fetchedReadings.length,
            total,
          });

          const { readings } = get();
          set({
            readings:
              skip === 0
                ? fetchedReadings
                : [...readings, ...fetchedReadings],
            readingsTotal: total,
          });
        } catch (error) {
          logWithContext("error", "[ClientStore] Failed to fetch readings", {
            error: error instanceof Error ? error.message : String(error),
          });
          set({
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
      // ============================================
      // 占い履歴キャッシュの無効化
      // ============================================
      // 新しい Reading が保存されたタイミングで呼ぶ。次に履歴画面を開いた際に
      // 必ずサーバーから取り直すことで、「古いキャッシュ → fresh に差し替え」の
      // 中途半端な表示を防ぐ。
      invalidateReadings: () => {
        logWithContext("info", "[ClientStore] Invalidating readings cache");
        set({ readings: [], readingsTotal: 0, skip: 0 });
      },

      setParams: (params: PaginationParams) => {
        const take = params.take ?? get().take;
        const skip = params.take
          ? 0
          : params.skip
          ? params.skip - (params.skip % take) // params.skip が take の倍数になるように調整
          : params.next
          ? get().skip + take
          : params.prev
          ? Math.max(0, get().skip - take)
          : get().skip;
        set({ take, skip });
        logWithContext("info", "[ClientStore] Setting pagination params", {
          take,
          skip,
        });
        return { take, skip };
      },
      setTake: (take: number) => {
        logWithContext("info", "[ClientStore] Setting take", { take });
        set({ take, skip: 0 });
      },
      setSkip: (skip: number) => {
        logWithContext("info", "[ClientStore] Setting skip", { skip });
        set({ skip: skip - (skip % get().take) }); // skip が take の倍数になるように調整
      },

      // ============================================
      // ============================================
      // リセット
      // ============================================
      reset: () => {
        logWithContext("info", "[ClientStore] Resetting to initial state");
        set({
          isReady: false,
          currentPlan: guestPlan,
          usage: null,
          lastFetchedDate: null,
        });
      },
    }),

    {
      name: "client-storage",
      version: 1,
      // v1 移行: API レスポンス形式変更前の壊れた readings キャッシュをクリア
      migrate: (persistedState: unknown, _version: number) => {
        if (persistedState && typeof persistedState === "object") {
          return {
            ...(persistedState as Record<string, unknown>),
            readings: [],
            readingsTotal: 0,
          };
        }
        return persistedState;
      },
      // readings は毎回サーバーから取得するため永続化しない
      partialize: (state) => {
        const { readings: _r, readingsTotal: _t, ...rest } = state;
        return rest;
      },
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          const value = await storeRepository.get(name);
          return value ? JSON.stringify(value) : null;
        },
        setItem: async (name: string, value: string) => {
          const parsed = JSON.parse(value);
          await storeRepository.set(name, parsed);
        },
        removeItem: async (name: string) => {
          await storeRepository.delete(name);
        },
      })),
    }
  )
);
