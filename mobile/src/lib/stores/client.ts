import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Plan, UsageStats } from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";
import { clientService } from "../services/client";
import { getTodayJST } from "../utils/date";
import { useAuthStore } from "./auth";
import { useSubscriptionStore } from "./subscription";

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
  // アクション: プラン変更
  // ============================================
  changePlan: (newPlan: Plan) => Promise<void>;

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
 * - プラン変更フロー（認証・購読統合）
 * - 日次リセット管理
 * - 楽観的UI更新
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
            remainingReadings: usage.remainingReadings,
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
      // プラン変更（認証・購読統合）
      // ============================================
      changePlan: async (newPlan: Plan) => {
        const { isChangingPlan, currentPlan } = get();

        // 既に変更処理中なら中断
        if (isChangingPlan) {
          logWithContext(
            "warn",
            "[ClientStore] Plan change already in progress"
          );
          return;
        }

        // 同じプランなら何もしない
        if (currentPlan?.code === newPlan.code) {
          logWithContext("info", "[ClientStore] Already on target plan");
          return;
        }

        // GUESTプランへの変更は不可
        if (newPlan.code === "GUEST") {
          logWithContext("warn", "[ClientStore] Cannot change to GUEST plan");
          set({
            planChangeError: "GUESTプランへの変更はできません",
          });
          return;
        }

        logWithContext("info", "[ClientStore] Starting plan change", {
          from: currentPlan?.code,
          to: newPlan.code,
        });

        set({ isChangingPlan: true, planChangeError: null });

        try {
          const authStore = useAuthStore.getState();
          const subscriptionStore = useSubscriptionStore.getState();

          // ============================================
          // ✅ ステップ1: 認証が必要な場合はログイン
          // ============================================
          if (!authStore.isAuthenticated) {
            logWithContext("info", "[ClientStore] Authentication required");

            try {
              await authStore.login();

              logWithContext("info", "[ClientStore] Login successful");

              // ログイン後のプランをチェック
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
            } catch (loginError) {
              const errorMessage =
                loginError instanceof Error
                  ? loginError.message
                  : String(loginError);

              const isCancelled =
                errorMessage.includes("キャンセル") ||
                errorMessage.toLowerCase().includes("cancel");

              logWithContext("error", "[ClientStore] Login failed", {
                error: errorMessage,
                isCancelled,
              });

              set({
                isChangingPlan: false,
                planChangeError: isCancelled
                  ? "ログインがキャンセルされました"
                  : `ログインに失敗しました: ${errorMessage}`,
              });

              return; // ログイン失敗時は処理を中断
            }
          }

          // ============================================
          // ✅ ステップ2: 有料プランの場合は購読処理
          // ============================================
          if (newPlan.price > 0) {
            logWithContext(
              "info",
              "[ClientStore] Paid plan, initiating purchase"
            );

            try {
              // RevenueCat経由で購入
              await subscriptionStore.purchasePlan(newPlan);

              logWithContext("info", "[ClientStore] Purchase completed");
            } catch (purchaseError) {
              const errorMessage =
                purchaseError instanceof Error
                  ? purchaseError.message
                  : String(purchaseError);

              logWithContext("error", "[ClientStore] Purchase failed", {
                error: errorMessage,
              });

              // 購入失敗時は状態を復旧
              await get().refreshUsage();

              set({
                isChangingPlan: false,
                planChangeError: `購入に失敗しました: ${errorMessage}`,
              });

              throw purchaseError;
            }
          } else {
            // ============================================
            // ✅ ステップ3: 無料プランの場合はサーバーAPIで変更
            // ============================================
            logWithContext("info", "[ClientStore] Free plan, changing via API");

            const result = await clientService.changePlan(newPlan.code);
            authStore.setPayload(result.payload);
          }

          // ============================================
          // ✅ ステップ4: 利用状況を更新して完了
          // ============================================
          await get().refreshUsage();

          set({
            currentPlan: newPlan,
            isChangingPlan: false,
            planChangeError: null,
          });

          logWithContext("info", "[ClientStore] Plan change completed", {
            newPlan: newPlan.code,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          logWithContext("error", "[ClientStore] Plan change failed", {
            error: errorMessage,
          });

          // エラー時は状態を復旧
          try {
            await get().refreshUsage();
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
          currentPlan: null,
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
