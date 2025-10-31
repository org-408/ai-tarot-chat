import { Dialog } from "@capacitor/dialog";
import type { CustomerInfo } from "@revenuecat/purchases-capacitor";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AppJWTPayload, Plan } from "../../../../shared/lib/types";
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

  // 復元アラート情報
  restoreAlert: {
    shouldShow: boolean;
    hasUnrestoredPurchase: boolean;
    hasShown: boolean;
  } | null;

  // ============================================
  // アクション
  // ============================================
  init: () => Promise<void>;
  listener: (info: CustomerInfo) => Promise<void>;
  _checkRestoreStatus: () => Promise<void>;
  dismissRestoreAlert: () => void;
  login: (userId: string) => Promise<CustomerInfo>;
  logout: () => Promise<CustomerInfo>;
  retryInitAndLogin: () => Promise<CustomerInfo>;
  purchasePlan: (targetPlan: Plan) => Promise<CustomerInfo>;
  restorePurchases: () => Promise<CustomerInfo>;
  refreshCustomerInfo: () => Promise<CustomerInfo>;
  openManage: () => Promise<void>;
  getAppUserId: () => Promise<string>;
  isAnonymous: () => Promise<boolean>;
  getCurrentPlan: () => Promise<Plan>;
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
      restoreAlert: null,

      // ============================================
      // 初期化
      // ============================================
      init: async () => {
        const { isInitialized } = get();

        logWithContext("info", "[SubscriptionStore] Initializing", {
          isInitialized,
        });

        // 毎回強制的に初期化する方針に変更。念のためロジックは残す
        // if (isInitialized) {
        //   logWithContext("info", "[SubscriptionStore] Already initialized");
        //   return;
        // }

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

            // ✅ 復元状態チェック
            await get()._checkRestoreStatus();

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

      /**
       * ✅ 内部メソッド：復元状態チェック
       */
      _checkRestoreStatus: async () => {
        logWithContext("info", "[Subscription] Checking restore status");
        const { customerInfo, restoreAlert } = get();
        const authStore = useAuthStore.getState();

        const isGuest = !authStore.isAuthenticated;

        // 購読がなく、ゲストユーザーじゃない場合は復元不要
        if (!isGuest) {
          set({ restoreAlert: null });
          logWithContext("info", "[Subscription] No restore needed");
          return;
        }

        // ✅ ゲストの場合、syncPurchases で購買情報を同期（OSプロンプトなし）
        logWithContext("info", "[Subscription] Guest user, syncing purchases");

        let syncedInfo: CustomerInfo;
        try {
          // ✅ syncPurchases を実行
          await subscriptionService.syncPurchases();

          // 最新の CustomerInfo を取得
          syncedInfo = await subscriptionService.getCustomerInfo();
          set({ customerInfo: syncedInfo });

          logWithContext(
            "info",
            "[Subscription] Purchases synced successfully",
            {
              entitlements: Object.keys(syncedInfo.entitlements.active),
            }
          );
        } catch (error) {
          logWithContext("error", "[Subscription] Sync failed", { error });
          // エラーでも既存の customerInfo を使う
          syncedInfo = customerInfo!;
        }

        // ✅ 購買状態をチェック
        const hasSubscription = syncedInfo
          ? Object.keys(syncedInfo.entitlements.active).length > 0
          : false;

        if (!hasSubscription) {
          set({ restoreAlert: null });
          logWithContext("info", "[Subscription] No subscription found");
          return;
        }

        const hasShownInThisSession = restoreAlert?.hasShown || false;

        if (!hasShownInThisSession) {
          logWithContext("info", "[Subscription] Showing restore alert");

          // ✅ 情報提示型（確認のみ）
          await Dialog.alert({
            title: "過去の購入が見つかりました",
            message: "課金情報が復元されますので、サインインしてください。",
            buttonTitle: "OK",
          });

          // ✅ OK 押したら即サインイン
          logWithContext(
            "info",
            "[Subscription] User acknowledged, proceeding to sign in"
          );

          let payload: AppJWTPayload | null = null;
          try {
            payload = await useAuthStore.getState().login();
            logWithContext("info", "[Subscription] Sign in completed");
          } catch (error) {
            logWithContext("error", "[Subscription] Sign in failed", { error });
            // サインイン失敗してもセッション中は表示済みとする
          }

          if (payload && payload.user) {
            try {
              // ✅ サインイン後、RevenueCatにもログイン
              await get().login(payload.user.id);
              logWithContext(
                "info",
                "[Subscription] RevenueCat login after sign in completed"
              );

              // 念の為、syncPurchases も実行
              await subscriptionService.syncPurchases();
              logWithContext(
                "info",
                "[Subscription] syncPurchases after sign in completed"
              );

              // CustomerInfoを更新
              const updatedInfo = await subscriptionService.getCustomerInfo();
              set({ customerInfo: updatedInfo });
              logWithContext(
                "info",
                "[Subscription] CustomerInfo updated after sign in",
                {
                  entitlements: Object.keys(updatedInfo.entitlements.active),
                }
              );
            } catch (error) {
              logWithContext(
                "error",
                "[Subscription] RevenueCat login after sign in failed",
                { error }
              );
            }
          }
        }

        set({
          restoreAlert: {
            shouldShow: false,
            hasUnrestoredPurchase: true,
            hasShown: true,
          },
        });
        logWithContext("info", "[Subscription] Checking restore completed");
      },

      /**
       * ✅ アラート非表示（シンプル化）NOTE: 一応用意するが、UI上はOKのみ開放している
       */
      dismissRestoreAlert: () => {
        const current = get().restoreAlert;
        if (current) {
          set({
            restoreAlert: {
              ...current,
              shouldShow: false,
              hasShown: true, // ← これで永続化される
            },
          });
        }

        logWithContext("info", "[Subscription] Restore alert dismissed");
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

          // restoreAlert をここでリセットする（復元完了扱い）
          set({ isLoggedIn: true, customerInfo, restoreAlert: null });

          logWithContext("info", "[SubscriptionStore] Logged in successfully", {
            entitlements: Object.keys(customerInfo.entitlements.active),
          });
          return customerInfo;
        } catch (error) {
          logWithContext("error", "[SubscriptionStore] Login failed", {
            error: error instanceof Error ? error.message : String(error),
          });

          // プラン変更の失敗に関わるのでリトライ
          logWithContext(
            "info",
            "[SubscriptionStore] Retrying login to RevenueCat"
          );
          try {
            // 初期化・ログインの再実行
            const retryInfo = await get().retryInitAndLogin();

            set({
              customerInfo: retryInfo,
            });

            logWithContext(
              "info",
              "[SubscriptionStore] Login retried and completed successfully"
            );
            return retryInfo;
          } catch (retryError) {
            const retryErrorMessage =
              retryError instanceof Error
                ? retryError.message
                : String(retryError);
            logWithContext("error", "[SubscriptionStore] Login retry failed", {
              error: retryErrorMessage,
            });
            throw retryError;
          }
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

      retryInitAndLogin: async () => {
        logWithContext(
          "info",
          "[SubscriptionStore] Retrying initialization and login"
        );

        try {
          // 再初期化
          await subscriptionService.initialize();

          // 再ログイン
          const userId = useAuthStore.getState().payload!.user!.id;
          if (!userId) {
            throw new Error("User ID is missing for re-login");
          }
          const info = await subscriptionService.login(userId);

          set({
            isInitialized: true,
            isLoggedIn: true,
            customerInfo: info,
          });

          logWithContext(
            "info",
            "[SubscriptionStore] Initialization and login retried successfully",
            {
              entitlements: Object.keys(info.entitlements.active),
            }
          );
          return info;
        } catch (error) {
          logWithContext(
            "error",
            "[SubscriptionStore] Retry of initialization and login failed",
            {
              error: error instanceof Error ? error.message : String(error),
            }
          );
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
            // 初期化・ログインを再実行
            await get().retryInitAndLogin();

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
      // AppUserIDを取得
      // ============================================
      getAppUserId: async () => {
        logWithContext("info", "[SubscriptionStore] Getting App User ID");

        try {
          const appUserId = await subscriptionService.getAppUserId();

          logWithContext(
            "info",
            "[SubscriptionStore] App User ID retrieved successfully",
            { appUserId }
          );
          return appUserId;
        } catch (error) {
          logWithContext(
            "error",
            "[SubscriptionStore] Failed to get App User ID",
            {
              error: error instanceof Error ? error.message : String(error),
            }
          );
          throw error;
        }
      },

      // ============================================
      // 匿名ユーザーかどうか判定
      // ============================================
      isAnonymous: async () => {
        logWithContext(
          "info",
          "[SubscriptionStore] Checking if user is anonymous"
        );
        try {
          const isAnonymous = await subscriptionService.isAnonymous();
          logWithContext(
            "info",
            "[SubscriptionStore] isAnonymous check completed",
            { isAnonymous }
          );
          return isAnonymous;
        } catch (error) {
          logWithContext(
            "error",
            "[SubscriptionStore] Failed to check if user is anonymous",
            {
              error: error instanceof Error ? error.message : String(error),
            }
          );
          throw error;
        }
      },

      // ============================================
      // 現在のプランを取得
      // ============================================
      getCurrentPlan: async () => {
        const plans = useMasterStore.getState().masterData?.plans;

        const customerInfo = await subscriptionService.getCustomerInfo();

        if (!customerInfo || !plans) {
          logWithContext(
            "info",
            "[SubscriptionStore] Cannot determine current plan - missing data"
          );
          throw new Error("Cannot determine current plan - missing data");
        }
        const activeEntitlements = Object.keys(
          customerInfo.entitlements.active
        );
        const currentPlan = plans.find((plan) =>
          activeEntitlements.includes(getEntitlementIdentifier(plan.code))
        );

        if (currentPlan) {
          logWithContext(
            "info",
            "[SubscriptionStore] Current plan determined",
            { plan: currentPlan.code }
          );
          return currentPlan;
        } else {
          logWithContext(
            "info",
            "[SubscriptionStore] No active plan found in CustomerInfo"
          );
          // サインイン状態からプランを判定
          const isAuthenticated = useAuthStore.getState().isAuthenticated;

          return plans.find(
            (plan) => plan.code === (isAuthenticated ? "FREE" : "GUEST")
          )!;
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
