import type { CustomerInfo } from "@revenuecat/purchases-capacitor";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Plan } from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";
import { subscriptionService } from "../services/subscription";
import { getEntitlementIdentifier } from "../utils/plan-utils";
import { useAuthStore } from "./auth";
import { useClientStore } from "./client";
import { useMasterStore } from "./master";

interface SubscriptionState {
  // ============================================
  // 状態
  // ============================================
  isInitialized: boolean;
  isLoggedIn: boolean;
  customerInfo: CustomerInfo | null;
  isPurchasing: boolean;
  purchaseError: string | null;

  // ============================================
  // アクション
  // ============================================
  init: () => Promise<void>;
  listener: (info: CustomerInfo) => Promise<void>;
  login: (userId: string) => Promise<CustomerInfo>;
  logout: () => Promise<CustomerInfo>;
  purchasePlan: (targetPlan: Plan) => Promise<CustomerInfo>;
  restorePurchases: () => Promise<CustomerInfo>;
  refreshCustomerInfo: () => Promise<CustomerInfo>;
  openManage: () => Promise<void>;
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
      isLoggedIn: false,
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

            // CustomerInfo変更リスナーを設定
            await subscriptionService.setupCustomerInfoListener(get().listener);
            logWithContext("info", "[SubscriptionStore] Listener set up", {
              handler: get().listener.name || "anonymous",
            });
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
          }
        } catch (error) {
          logWithContext("error", "[SubscriptionStore] Initialization failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        } finally {
          set({ isInitialized: true });
        }
      },

      // ============================================
      // 購読状態変更リスナー
      // ============================================
      listener: async (info: CustomerInfo) => {
        logWithContext(
          "info",
          "[SubscriptionStore] CustomerInfo updated via listener",
          {
            entitlements: Object.keys(info.entitlements.active),
          }
        );

        // チェンジプラン進行中は同期しない
        const { isPurchasing } = get();
        if (isPurchasing) {
          // NOTE: 証跡としてログを残す。ここでは状態変更はしない
          logWithContext(
            "info",
            "[SubscriptionStore] Skipping sync during purchase",
            { entitlements: Object.keys(info.entitlements.active) }
          );
          return;
        }

        try {
          // 状態変更
          set({ customerInfo: info });
          logWithContext(
            "info",
            "[SubscriptionStore] CustomerInfo synchronized this store",
            {
              entitlements: Object.keys(info.entitlements.active),
            }
          );

          // Client の状態変更のみでOKとする
          const plans = useMasterStore.getState().masterData?.plans;
          // ありえないが念のため
          if (!plans) {
            logWithContext(
              "warn",
              "[SubscriptionStore] Master data not loaded, cannot sync plan"
            );
            return;
          }
          // NOTE: customerInfo から現在のプランを判定(複数はないものと見做す)
          const activeEntitlements = Object.keys(info.entitlements.active);
          const newPlan = plans.find((plan) =>
            activeEntitlements.includes(getEntitlementIdentifier(plan.code))
          );
          // ありえないが念のため
          if (!newPlan) {
            logWithContext(
              "info",
              "[SubscriptionStore] No active plan found in CustomerInfo"
            );
            return;
          }
          // ClientStore のプランを更新
          await useClientStore.getState().changePlan(newPlan!);
          logWithContext(
            "info",
            "[SubscriptionStore] Client store plan synchronized",
            { plan: newPlan.code }
          );
        } catch (error) {
          logWithContext(
            "error",
            "[SubscriptionStore] Failed to sync CustomerInfo with server",
            {
              error: error instanceof Error ? error.message : String(error),
            }
          );
          // 同期失敗でもCustomerInfoは更新しておく
          set({ customerInfo: info });
        }
      },

      // ============================================
      // ログイン
      // ============================================
      login: async (userId: string) => {
        const { isLoggedIn } = get();

        if (isLoggedIn) {
          logWithContext("info", "[SubscriptionStore] Already logged in");
          return get().customerInfo!;
        }
        logWithContext("info", "[SubscriptionStore] Logging in to RevenueCat");

        try {
          // RevenueCatにログイン（匿名ユーザーとして）
          const customerInfo = await subscriptionService.login(userId);

          set({ isLoggedIn: true, customerInfo });

          logWithContext("info", "[SubscriptionStore] Logged in successfully", {
            entitlements: Object.keys(customerInfo.entitlements.active),
          });
          return customerInfo;
        } catch (error) {
          logWithContext("error", "[SubscriptionStore] Login failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },

      // ============================================
      // ログアウト
      // ============================================
      logout: async () => {
        const { isLoggedIn } = get();

        if (!isLoggedIn) {
          logWithContext("info", "[SubscriptionStore] Already logged out");
          return get().customerInfo!;
        }
        logWithContext(
          "info",
          "[SubscriptionStore] Logging out from RevenueCat"
        );

        try {
          // RevenueCatからログアウト、CustomerInfoを匿名ユーザーとして更新
          const customerInfo = await subscriptionService.logout();

          set({ isLoggedIn: false, customerInfo });

          logWithContext(
            "info",
            "[SubscriptionStore] Logged out successfully",
            {
              entitlements: Object.keys(customerInfo.entitlements.active),
            }
          );
          return customerInfo;
        } catch (error) {
          logWithContext("error", "[SubscriptionStore] Logout failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },

      // ============================================
      // プラン購入
      // NOTE: ユーザー課金に直結するのでリトライ・リカバリーを実施
      // ============================================
      purchasePlan: async (targetPlan: Plan) => {
        const { isPurchasing } = get();

        if (isPurchasing) {
          logWithContext(
            "warn",
            "[SubscriptionStore] Purchase already in progress"
          );
          return get().customerInfo!;
        }

        logWithContext("info", "[SubscriptionStore] Starting purchase", {
          targetPlan: targetPlan.code,
        });

        set({ isPurchasing: true, purchaseError: null });

        try {
          // RevenueCatで購入
          const customerInfo = await subscriptionService.purchase(targetPlan);

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
          return customerInfo;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // ユーザーキャンセルかエラーかを判定
          if (
            errorMessage.toLowerCase().includes("cancel") ||
            errorMessage.toLowerCase().includes("キャンセル")
          ) {
            logWithContext(
              "warn",
              "[SubscriptionStore] Purchase cancelled by user"
            );
            set({
              isPurchasing: false,
              purchaseError: "購入がキャンセルされました",
            });
            throw error;
          }

          // initialize からリトライする
          logWithContext(
            "info",
            "[SubscriptionStore] Purchase failed, re-initializing and retrying",
            { error: errorMessage }
          );

          try {
            // 再初期化
            await get().init();

            // 再ログイン
            const userId = useAuthStore.getState().payload!.user!.id;
            if (!userId) {
              throw new Error("User ID is missing for re-login");
            }
            await get().login(userId);

            // 再購入
            const customerInfo = await subscriptionService.purchase(targetPlan);

            set({
              isPurchasing: false,
              customerInfo,
              purchaseError: null,
            });

            logWithContext(
              "info",
              "[SubscriptionStore] Purchase retried and completed successfully",
              {
                targetPlan: targetPlan.code,
              }
            );
            return customerInfo;
          } catch (retryError) {
            const retryErrorMessage =
              retryError instanceof Error
                ? retryError.message
                : String(retryError);

            // ユーザーキャンセルかエラーかを判定
            if (
              retryErrorMessage.toLowerCase().includes("cancel") ||
              retryErrorMessage.toLowerCase().includes("キャンセル")
            ) {
              logWithContext(
                "warn",
                "[SubscriptionStore] Retry-Purchase cancelled by user"
              );
              set({
                isPurchasing: false,
                purchaseError: "購入がキャンセルされました",
              });
              throw error;
            }
            logWithContext(
              "error",
              "[SubscriptionStore] Purchase retry failed",
              { error: retryErrorMessage }
            );
            set({
              isPurchasing: false,
              purchaseError: `購入に失敗しました: ${retryErrorMessage}`,
            });
            throw retryError;
          }
        }
      },

      // ============================================
      // リストア
      // ============================================
      restorePurchases: async () => {
        logWithContext("info", "[SubscriptionStore] Restoring purchases");

        try {
          const customerInfo = await subscriptionService.restorePurchases();

          set({ customerInfo });

          logWithContext(
            "info",
            "[SubscriptionStore] Purchases restored successfully"
          );
          return customerInfo;
        } catch (error) {
          logWithContext("error", "[SubscriptionStore] Restore failed", {
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
          return customerInfo;
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
    }
  )
);
