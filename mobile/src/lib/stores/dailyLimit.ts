import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { UsageStats } from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";
import { clientService } from "../services/client";
import { getTodayJST, isSameDayJST } from "../utils/date";

interface DailyLimitState {
  isReady: boolean;
  usage: UsageStats | null;
  lastFetchedDate: string | null; // YYYY-MM-DD形式

  // アクション
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  checkDateAndReset: () => Promise<boolean>;
  reset: () => void; // ストアをリセット（テスト用）
}

export const useDailyLimitStore = create<DailyLimitState>()(
  persist(
    (set, get) => ({
      isReady: false,
      usage: null,
      lastFetchedDate: null,

      init: async () => {
        logWithContext("info", "[DailyLimit] Initializing...");
        try {
          const usage = await clientService.getUsageAndReset();
          const today = getTodayJST();

          set({
            usage,
            lastFetchedDate: today,
            isReady: true,
          });
          logWithContext("info", "[DailyLimit] Initialized:", { usage });
        } catch (error) {
          logWithContext("error", "[DailyLimit] Init failed:", { error });
          set({ isReady: true });
        }
      },

      refresh: async () => {
        logWithContext("info", "[DailyLimit] Refreshing usage...");
        try {
          const usage = await clientService.getUsageAndReset();
          const today = getTodayJST();

          set({
            usage,
            lastFetchedDate: today,
          });
          logWithContext("info", "[DailyLimit] Refreshed:", { usage });
        } catch (error) {
          logWithContext("error", "[DailyLimit] Refresh failed:", { error });
        }
      },

      // 日付が変わったかチェック＆必要ならリセット
      checkDateAndReset: async () => {
        logWithContext("info", "[DailyLimit] Checking date change...");

        const { lastFetchedDate } = get();
        const today = getTodayJST();

        // 日付が変わっていない場合はスキップ
        if (
          isSameDayJST(lastFetchedDate ? new Date(lastFetchedDate) : undefined)
        ) {
          logWithContext("info", "[DailyLimit] Same day, skipping reset");
          return false;
        }

        try {
          // 日付が変わっているのでサーバーから最新データ取得
          // サーバー側で日次リセットが実行される
          const usage = await clientService.getUsageAndReset();

          set({
            usage,
            lastFetchedDate: today,
          });

          logWithContext("info", "[DailyLimit] Date changed, limits reset:", {
            usage,
          });
          return true; // リセットされた
        } catch (error) {
          logWithContext("error", "[DailyLimit] Date check failed:", { error });
          return false;
        }
      },

      reset: () => {
        logWithContext("info", "[DailyLimit] Resetting store to initial state");
        set({
          isReady: false,
          usage: null,
          lastFetchedDate: null,
        });
      },
    }),
    {
      name: "daily-limit-storage",
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
