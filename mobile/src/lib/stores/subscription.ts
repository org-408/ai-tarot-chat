import type { CustomerInfo } from "@revenuecat/purchases-capacitor";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Plan } from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";
import { subscriptionService } from "../services/subscription";

interface SubscriptionState {
  // ============================================
  // 状態
  // ============================================
  isInitialized: boolean;
  customerInfo: CustomerInfo | null;
  isPurchasing: boolean;
  purchaseError: string | null;

  // ============================================
  // アクション
  // ============================================
  init: () => Promise<void>;
  purchasePlan: (targetPlan: Plan) => Promise<void>;
  restorePurchases: () => Promise<void>;
  openManage: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

/**
 * Subscription Store
 *
 * RevenueCat関連の状態とアクションを管理
 *
 * 責務:
 * - RevenueCatの初期化状態
 * - 購入フローの状態管理
 * - CustomerInfoのキャッシュ
 * - エラーハンドリング
 */
export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      // ============================================
      // 初期状態
      // ============================================
      isInitialized: false,
      customerInfo: null,
      isPurchasing: false,
      purchaseError: null,

      // ============================================
      // 初期化
      // ============================================
      init: async () => {
        const { isInitialized } = get();

        if (isInitialized) {
          logWithContext("info", "[SubscriptionStore] Already initialized");
          return;
        }

        logWithContext("info", "[SubscriptionStore] Initializing");

        try {
          // RevenueCatを初期化
          await subscriptionService.initialize();

          // 現在のCustomerInfoを取得
          try {
            const customerInfo = await subscriptionService.getCustomerInfo();
            set({
              isInitialized: true,
              customerInfo,
            });

            logWithContext(
              "info",
              "[SubscriptionStore] Initialized with CustomerInfo",
              {
                entitlements: Object.keys(customerInfo.entitlements.active),
              }
            );
          } catch (infoError) {
            // CustomerInfo取得失敗は非致命的
            logWithContext(
              "warn",
              "[SubscriptionStore] CustomerInfo unavailable",
              {
                error:
                  infoError instanceof Error
                    ? infoError.message
                    : String(infoError),
              }
            );

            set({ isInitialized: true });
          }
        } catch (error) {
          logWithContext("error", "[SubscriptionStore] Initialization failed", {
            error: error instanceof Error ? error.message : String(error),
          });

          // 初期化失敗でも isInitialized を true にして先に進める
          set({ isInitialized: true });
        }
      },

      // ============================================
      // プラン購入
      // ============================================
      purchasePlan: async (targetPlan: Plan) => {
        const { isPurchasing } = get();

        if (isPurchasing) {
          logWithContext(
            "warn",
            "[SubscriptionStore] Purchase already in progress"
          );
          return;
        }

        logWithContext("info", "[SubscriptionStore] Starting purchase", {
          targetPlan: targetPlan.code,
        });

        set({ isPurchasing: true, purchaseError: null });

        try {
          // RevenueCatで購入 → サーバー検証
          await subscriptionService.purchaseAndChangePlan(targetPlan);

          // 購入成功後、CustomerInfoを更新
          const customerInfo = await subscriptionService.getCustomerInfo();

          set({
            isPurchasing: false,
            customerInfo,
            purchaseError: null,
          });

          logWithContext(
            "info",
            "[SubscriptionStore] Purchase completed successfully",
            {
              targetPlan: targetPlan.code,
            }
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // ユーザーキャンセルかエラーかを判定
          const isCancelled =
            errorMessage.toLowerCase().includes("cancel") ||
            errorMessage.toLowerCase().includes("キャンセル");

          const displayError = isCancelled
            ? "購入がキャンセルされました"
            : `購入に失敗しました: ${errorMessage}`;

          set({
            isPurchasing: false,
            purchaseError: displayError,
          });

          logWithContext("error", "[SubscriptionStore] Purchase failed", {
            error: errorMessage,
            isCancelled,
          });

          throw error;
        }
      },

      // ============================================
      // リストア
      // ============================================
      restorePurchases: async () => {
        logWithContext("info", "[SubscriptionStore] Restoring purchases");

        try {
          await subscriptionService.restorePurchases();

          // リストア後、CustomerInfoを更新
          const customerInfo = await subscriptionService.getCustomerInfo();

          set({ customerInfo });

          logWithContext(
            "info",
            "[SubscriptionStore] Purchases restored successfully"
          );
        } catch (error) {
          logWithContext("error", "[SubscriptionStore] Restore failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },

      // ============================================
      // 購読管理画面を開く
      // ============================================
      openManage: async () => {
        logWithContext("info", "[SubscriptionStore] Opening manage screen");

        try {
          await subscriptionService.openManage();
        } catch (error) {
          logWithContext("error", "[SubscriptionStore] Failed to open manage", {
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },

      // ============================================
      // CustomerInfo更新
      // ============================================
      refreshCustomerInfo: async () => {
        logWithContext("info", "[SubscriptionStore] Refreshing CustomerInfo");

        try {
          const customerInfo = await subscriptionService.getCustomerInfo();

          set({ customerInfo });

          logWithContext("info", "[SubscriptionStore] CustomerInfo refreshed", {
            entitlements: Object.keys(customerInfo.entitlements.active),
          });
        } catch (error) {
          logWithContext(
            "error",
            "[SubscriptionStore] Failed to refresh CustomerInfo",
            {
              error: error instanceof Error ? error.message : String(error),
            }
          );
          throw error;
        }
      },

      // ============================================
      // エラークリア
      // ============================================
      clearError: () => {
        set({ purchaseError: null });
        logWithContext("info", "[SubscriptionStore] Error cleared");
      },

      // ============================================
      // リセット
      // ============================================
      reset: () => {
        logWithContext("info", "[SubscriptionStore] Resetting state");
        set({
          isInitialized: false,
          customerInfo: null,
          isPurchasing: false,
          purchaseError: null,
        });
      },
    }),

    {
      name: "subscription-storage",
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
      // CustomerInfoは永続化しない（セキュリティ上の理由）
      partialize: (state) => ({
        isInitialized: state.isInitialized,
      }),
    }
  )
);
