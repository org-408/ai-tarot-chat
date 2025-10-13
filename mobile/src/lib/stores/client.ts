import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Plan, UsageStats } from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";
import { clientService } from "../services/client";
import { useAuthStore } from "./auth";

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
  isChangingPlan: boolean;
  planChangeError: string | null;

  // ============================================
  // アクション: 利用状況
  // ============================================
  init: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  checkAndResetIfNeeded: () => Promise<boolean>;
  decrementOptimistic: (type: "readings" | "celtics" | "personal") => void;

  // ============================================
  // アクション: プラン変更（認証込み）
  // ============================================
  changePlan: (newPlan: Plan) => Promise<void>;

  // ============================================
  // リセット
  // ============================================
  reset: () => void;
}

/**
 * Client ストア
 *
 * ユーザー、プラン、利用状況など、クライアントに関する全てを管理
 *
 * ⚠️ 旧 usage.ts から改名 & 拡張
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
      isChangingPlan: false,
      planChangeError: null,

      // ============================================
      // 利用プラン、利用状況の初期化
      // ============================================
      init: async () => {
        logWithContext("info", "[ClientStore] Initializing");

        try {
          const usage = await clientService.getUsageAndReset();
          const currentPlan = usage.plan;
          const today = new Date().toISOString().split("T")[0];

          await clientService.saveLastFetchedDate(today);

          set({
            currentPlan,
            usage,
            lastFetchedDate: today,
            isReady: true,
          });

          logWithContext("info", "[ClientStore] Initialized", {
            planCode: usage.plan.code,
            remainingReadings: usage.remainingReadings,
          });
        } catch (error) {
          logWithContext("error", "[ClientStore] Init failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          set({ isReady: true });
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
          const today = new Date().toISOString().split("T")[0];

          await clientService.saveLastFetchedDate(today);

          set({ currentPlan, usage, lastFetchedDate: today });

          logWithContext("info", "[ClientStore] Refreshed", {
            remainingReadings: usage.remainingReadings,
          });
        } catch (error) {
          logWithContext("error", "[ClientStore] Refresh failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },

      // ============================================
      // 日付チェック & リセット
      // ============================================
      checkAndResetIfNeeded: async () => {
        logWithContext("info", "[ClientStore] Checking date change");

        try {
          const lastDate = await clientService.getLastFetchedDate();
          const today = new Date().toISOString().split("T")[0];

          if (lastDate === today) {
            logWithContext("info", "[ClientStore] Same day, no reset needed");
            return false;
          }

          logWithContext(
            "info",
            "[ClientStore] Date changed, fetching fresh data"
          );
          const usage = await clientService.getUsageAndReset();
          const currentPlan = usage.plan;

          await clientService.saveLastFetchedDate(today);

          set({ currentPlan, usage, lastFetchedDate: today });

          logWithContext("info", "[ClientStore] Date changed, limits reset", {
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

        logWithContext("info", "[ClientStore] Optimistic decrement", {
          type,
          remaining: usage[field] - 1,
        });
      },

      // ============================================
      // プラン変更（自動判定）
      // ============================================
      changePlan: async (newPlan: Plan) => {
        // 既に変更処理中なら何もしない
        if (get().isChangingPlan) {
          logWithContext(
            "warn",
            "[ClientStore] Plan change already in progress"
          );
          return;
        }

        logWithContext("info", "[ClientStore] Plan change started", {
          newPlan,
        });

        try {
          set({ isChangingPlan: true, planChangeError: null });

          const currentPlan = get().currentPlan!;

          // 同じプランなら何もしない
          if (currentPlan.code === newPlan.code) {
            logWithContext("info", "[ClientStore] Same plan, no change needed");
            set({ isChangingPlan: false });
            return;
          }

          const authStore = useAuthStore.getState();
          const isDowngrade = newPlan.no < currentPlan.no;

          // ============================================
          // ✅ ログインが必要な場合
          // ============================================
          if (!isDowngrade && !authStore.isAuthenticated) {
            logWithContext("info", "[ClientStore] Starting login for upgrade");

            try {
              await authStore.login();

              logWithContext("info", "[ClientStore] Login successful");

              // ログイン後のプランを確認
              const newPayload = authStore.payload;

              if (newPayload?.planCode === newPlan.code) {
                logWithContext(
                  "info",
                  "[ClientStore] Already on target plan after login"
                );
                await get().refreshUsage();
                set({ currentPlan: newPlan, isChangingPlan: false });
                return;
              }

              logWithContext("info", "[ClientStore] Continuing to plan change");
            } catch (loginError) {
              const errorMessage =
                loginError instanceof Error
                  ? loginError.message
                  : String(loginError);

              logWithContext(
                "error",
                "[ClientStore] Login failed or cancelled",
                {
                  error: errorMessage,
                }
              );

              // ✅ キャンセル vs エラーの判定
              const isCancelled =
                errorMessage.includes("キャンセル") ||
                errorMessage.includes("cancel") ||
                errorMessage.includes("cancelled");

              set({
                isChangingPlan: false,
                planChangeError: isCancelled
                  ? "ログインがキャンセルされました"
                  : `ログインに失敗しました: ${errorMessage}`,
              });

              // ✅ 元の状態を維持（throw しない！）
              return;
            }
          }

          // ============================================
          // ✅ プラン変更API実行
          // ============================================
          logWithContext("info", "[ClientStore] Executing plan change API", {
            from: currentPlan.code,
            to: newPlan.code,
          });

          const result = await clientService.changePlan(newPlan.code);
          authStore.setPayload(result.payload);
          await get().refreshUsage();

          set({ currentPlan: newPlan, isChangingPlan: false });

          logWithContext("info", "[ClientStore] Plan change successful");
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          logWithContext("error", "[ClientStore] Plan change API failed", {
            newPlan,
            error: errorMessage,
          });

          // ✅ プラン変更API失敗時の状態復旧
          try {
            await get().refreshUsage();
            logWithContext("info", "[ClientStore] Refreshed usage after error");
          } catch (refreshError) {
            logWithContext(
              "error",
              "[ClientStore] Failed to refresh after error",
              {
                refreshError:
                  refreshError instanceof Error
                    ? refreshError.message
                    : String(refreshError),
              }
            );
          }

          set({
            isChangingPlan: false,
            planChangeError: `プラン変更に失敗しました: ${errorMessage}`,
          });

          throw error;
        }
      },

      // ============================================
      // リセット
      // ============================================
      reset: () => {
        logWithContext("info", "[ClientStore] Resetting to initial state");
        set({
          isReady: false,
          usage: null,
          lastFetchedDate: null,
          isChangingPlan: false,
          planChangeError: null,
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
