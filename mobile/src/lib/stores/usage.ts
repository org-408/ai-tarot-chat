import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { UsageStats } from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";
import { clientService } from "../services/client";

interface UsageState {
  // 状態
  isReady: boolean;
  usage: UsageStats | null;
  lastFetchedDate: string | null; // YYYY-MM-DD

  // アクション
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  checkAndResetIfNeeded: () => Promise<boolean>;
  decrementOptimistic: (type: "readings" | "celtics" | "personal") => void;
  reset: () => void;
}

/**
 * 利用状況ストア
 * ⚠️ ストレージアクセスは clientService 経由で行う
 */
export const useUsageStore = create<UsageState>()(
  persist(
    (set, get) => ({
      isReady: false,
      usage: null,
      lastFetchedDate: null,

      init: async () => {
        logWithContext("info", "[UsageStore] Initializing");

        try {
          // ✅ clientService 経由で取得
          const usage = await clientService.getUsageAndReset();
          const today = new Date().toISOString().split("T")[0];

          await clientService.saveLastFetchedDate(today);

          set({
            usage,
            lastFetchedDate: today,
            isReady: true,
          });

          logWithContext("info", "[UsageStore] Initialized", {
            planCode: usage.planCode,
            remainingReadings: usage.remainingReadings,
          });
        } catch (error) {
          logWithContext("error", "[UsageStore] Init failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          set({ isReady: true });
        }
      },

      refresh: async () => {
        logWithContext("info", "[UsageStore] Refreshing usage");

        try {
          // ✅ clientService 経由で取得
          const usage = await clientService.getUsageAndReset();
          const today = new Date().toISOString().split("T")[0];

          await clientService.saveLastFetchedDate(today);

          set({
            usage,
            lastFetchedDate: today,
          });

          logWithContext("info", "[UsageStore] Refreshed", {
            remainingReadings: usage.remainingReadings,
          });
        } catch (error) {
          logWithContext("error", "[UsageStore] Refresh failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },

      /**
       * 日付が変わったかチェック & 必要ならリセット
       */
      checkAndResetIfNeeded: async () => {
        logWithContext("info", "[UsageStore] Checking date change");

        try {
          const lastDate = await clientService.getLastFetchedDate();
          const today = new Date().toISOString().split("T")[0];

          if (lastDate === today) {
            logWithContext("info", "[UsageStore] Same day, no reset needed");
            return false;
          }

          // 日付が変わっている → サーバーから最新取得
          logWithContext(
            "info",
            "[UsageStore] Date changed, fetching fresh data"
          );
          const usage = await clientService.getUsageAndReset();

          await clientService.saveLastFetchedDate(today);

          set({
            usage,
            lastFetchedDate: today,
          });

          logWithContext("info", "[UsageStore] Date changed, limits reset", {
            remainingReadings: usage.remainingReadings,
          });

          return true;
        } catch (error) {
          logWithContext("error", "[UsageStore] Date check failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          return false;
        }
      },

      /**
       * 楽観的更新（占い実行時に即座にカウントダウン）
       */
      decrementOptimistic: (type: "readings" | "celtics" | "personal") => {
        const { usage } = get();
        if (!usage) return;

        const field =
          type === "readings"
            ? "remainingReadings"
            : type === "celtics"
            ? "remainingCeltics"
            : "remainingPersonal";

        set({
          usage: {
            ...usage,
            [field]: Math.max(0, usage[field] - 1),
          },
        });

        logWithContext("info", "[UsageStore] Optimistic decrement", {
          type,
          remaining: usage[field] - 1,
        });
      },

      reset: () => {
        logWithContext("info", "[UsageStore] Resetting to initial state");
        set({
          isReady: false,
          usage: null,
          lastFetchedDate: null,
        });
      },
    }),

    {
      name: "usage-storage",
      // ⚠️ Persist middleware だけは storeRepository を直接使う（これはOK）
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
