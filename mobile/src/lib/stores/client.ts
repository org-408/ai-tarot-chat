import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Plan, UsageStats } from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";
import { clientService } from "../services/client";
import { getTodayJST } from "../utils/date";

interface ClientState {
  // ============================================
  // 利用状況の状態
  // ============================================
  isReady: boolean;
  usage: UsageStats | null;
  lastFetchedDate: string | null;

  // ============================================
  // プラン変更の状態
  // ============================================
  currentPlan: Plan | null;

  // ============================================
  // アクション: 利用状況
  // ============================================
  init: () => Promise<void>;
  changePlan: (newPlan: Plan) => Promise<void>;
  refreshUsage: () => Promise<void>;
  checkAndResetIfNeeded: () => Promise<boolean>;
  decrementOptimistic: (type: "readings" | "celtics" | "personal") => void;

  // ============================================
  // リセット
  // ============================================
  reset: () => void;
}

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
      currentPlan: null,
      usage: null,
      lastFetchedDate: null,

      // ============================================
      // 初期化
      // ============================================
      init: async () => {
        logWithContext("info", "[ClientStore] Initializing");

        try {
          // ✅ サーバーから利用状況を取得
          const usage = await clientService.getUsageAndReset();
          const currentPlan = usage.plan;
          const today = getTodayJST();

          await clientService.saveLastFetchedDate(today);

          set({
            currentPlan,
            usage,
            lastFetchedDate: today,
            isReady: true,
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
          set({ isReady: true });
        }
      },

      // ============================================
      // プラン変更
      // ============================================
      changePlan: async (newPlan: Plan) => {
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
            throw new Error("Server plan change failed");
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
          throw error;
        }
      },

      // ============================================
      // 利用状況の更新
      // ============================================
      refreshUsage: async () => {
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
          throw error;
        }
      },

      // ============================================
      // 日付チェック & リセット
      // ============================================
      checkAndResetIfNeeded: async () => {
        logWithContext("info", "[ClientStore] Checking date change");

        try {
          const lastDate = await clientService.getLastFetchedDate();
          const today = getTodayJST();

          if (lastDate === today) {
            logWithContext("info", "[ClientStore] Same day, no reset needed");
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
          return false;
        }
      },

      // ============================================
      // 楽観的更新
      // ============================================
      decrementOptimistic: (type: "readings" | "celtics" | "personal") => {
        const { usage } = get();
        if (!usage) return;

        const fieldMap = {
          readings: "remainingReadings",
          celtics: "remainingCeltics",
          personal: "remainingPersonal",
        } as const;

        const field = fieldMap[type];

        set({
          usage: {
            ...usage,
            [field]: Math.max(0, usage[field] - 1),
          },
        });

        logWithContext("info", "[ClientStore] Optimistic decrement", {
          type,
          remaining: usage[field] - 1,
        });
      },

      // ============================================
      // リセット
      // ============================================
      reset: () => {
        logWithContext("info", "[ClientStore] Resetting to initial state");
        set({
          isReady: false,
          currentPlan: null,
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
