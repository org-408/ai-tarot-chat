import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Plan,
  Reading,
  ReadingInput,
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
  changePlan: (newPlan: Plan) => Promise<void>;
  refreshUsage: () => Promise<void>;
  checkAndResetIfNeeded: () => Promise<boolean>;
  saveReading: (data: ReadingInput) => Promise<void>;
  fetchReadings: (params: PaginationParams) => Promise<void>;
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
      take: 20,
      skip: 0,
      error: null,

      // ============================================
      // 初期化
      // ============================================
      init: async () => {
        logWithContext("info", "[ClientStore] Initializing");
        set({ isReady: false, error: null });

        try {
          // ✅ サーバーから利用状況を取得
          const usage = await clientService.getUsageAndReset();
          const currentPlan = usage.plan;
          const today = getTodayJST();

          await clientService.saveLastFetchedDate(today);

          await clientService.getReadingHistory(get().take, get().skip);

          set({
            currentPlan,
            usage,
            lastFetchedDate: today,
            isReady: true,
            error: null,
          });

          logWithContext("info", "[ClientStore] Initialized successfully", {
            planCode: currentPlan.code,
            remainingReadings: usage.remainingReadings,
          });
        } catch (error) {
          logWithContext("error", "[ClientStore] Initialization failed", {
            error: error instanceof Error ? error.message : String(error),
          });

          // 初期化失敗でも isReady を true にして先に進める
          set({
            isReady: true,
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

      // ============================================
      // プラン変更
      // ============================================
      changePlan: async (newPlan: Plan) => {
        set({ error: null });

        logWithContext("info", "[ClientStore] Changing plan", {
          newPlanCode: newPlan.code,
        });

        // currentPlan が GUEST で、新プランが FREE の場合は状態変更のみ実施
        const { currentPlan } = get();
        const currentPlanCode = currentPlan ? currentPlan.code : "GUEST";
        if (currentPlanCode === "GUEST" && newPlan.price === 0) {
          logWithContext(
            "info",
            "[ClientStore] GUEST to FREE plan change, updating state only"
          );
          set({ currentPlan: newPlan });
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
      // 占い結果の保存
      // ============================================
      saveReading: async (data: ReadingInput) => {
        set({ error: null });

        logWithContext("info", "[ClientStore] Saving reading", { data });

        try {
          // サーバーに保存をリクエスト、返却値は Reading + UsageStats
          const result = await clientService.saveReading(data);
          logWithContext("info", "[ClientStore] Reading saved", { result });

          // 履歴に追加
          const { reading, usage } = result;
          const { readings } = get();
          set({ usage, readings: [reading, ...readings] });
        } catch (error) {
          logWithContext("error", "[ClientStore] Failed to save reading", {
            error: error instanceof Error ? error.message : String(error),
          });
          set({
            error: error instanceof Error ? error : new Error(String(error)),
          });
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
          const fetchedReadings = await clientService.getReadingHistory(
            take,
            skip
          );
          logWithContext("info", "[ClientStore] Readings fetched", {
            count: fetchedReadings.length,
          });

          const { readings } = get();
          // 既存の履歴に追加
          set({ readings: [...readings, ...fetchedReadings] });
        } catch (error) {
          logWithContext("error", "[ClientStore] Failed to fetch readings", {
            error: error instanceof Error ? error.message : String(error),
          });
          set({
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
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
