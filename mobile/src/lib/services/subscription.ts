import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import {
  type CustomerInfo,
  LOG_LEVEL,
  Purchases,
} from "@revenuecat/purchases-capacitor";
import { RevenueCatUI } from "@revenuecat/purchases-capacitor-ui";
import type { Plan } from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { useClientStore } from "../stores/client";
import { useMasterStore } from "../stores/master";
import { getPackageIdentifier } from "../utils/plan-utils";

/**
 * RevenueCat購読管理サービス
 *
 * 責務:
 * - RevenueCatの初期化と設定
 * - ユーザーのログイン/ログアウト
 * - プランの購入処理
 * - 購読状態の同期
 * - Customer Centerの表示
 */
export class SubscriptionService {
  private isInitialized = false;

  /**
   * RevenueCatの初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logWithContext("info", "[SubscriptionService] Already initialized");
      return;
    }

    logWithContext("info", "[SubscriptionService] Initializing RevenueCat");

    const platform = Capacitor.getPlatform();

    // Web環境ではスキップ
    if (platform === "web") {
      logWithContext(
        "warn",
        "[SubscriptionService] Skipping initialization on web platform"
      );
      this.isInitialized = true;
      return;
    }

    try {
      // デバッグログを有効化
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

      // プラットフォーム別の設定
      const apiKey =
        platform === "ios"
          ? import.meta.env.VITE_REVENUECAT_IOS_KEY
          : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;

      if (!apiKey) {
        logWithContext("error", "[SubscriptionService] API key not found", {
          platform,
        });
        throw new Error(`RevenueCat API key not found for ${platform}`);
      }

      await Purchases.configure({ apiKey });

      // ✅ 購読状態変更リスナーの登録
      await this.setupCustomerInfoListener();

      // ✅ アプリ復帰時の同期設定
      await this.setupAppStateListener();

      this.isInitialized = true;

      logWithContext("info", "[SubscriptionService] Initialized successfully", {
        platform,
      });
    } catch (error) {
      logWithContext("error", "[SubscriptionService] Initialization failed", {
        error: error instanceof Error ? error.message : String(error),
        platform,
      });
      throw error;
    }
  }

  /**
   * アプリ復帰時の購読状態確認と同期
   * lifecycle.ts から呼び出される
   */
  async checkAndSyncOnResume(): Promise<void> {
    logWithContext(
      "info",
      "[SubscriptionService] Checking subscription on resume"
    );

    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      await this.syncWithServer(customerInfo);

      logWithContext("info", "[SubscriptionService] Synced on app resume");
    } catch (error) {
      logWithContext(
        "error",
        "[SubscriptionService] Failed to sync on resume",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
      throw error;
    }
  }

  /**
   * CustomerInfo変更リスナーの設定
   * RevenueCatで購読状態が変更されたらサーバーと同期
   */
  private async setupCustomerInfoListener(): Promise<void> {
    try {
      await Purchases.addCustomerInfoUpdateListener(async (info) => {
        try {
          logWithContext("info", "[SubscriptionService] CustomerInfo updated", {
            entitlements: Object.keys(info.entitlements.active),
          });

          // サーバーと同期
          await this.syncWithServer(info);
        } catch (error) {
          logWithContext(
            "error",
            "[SubscriptionService] Failed to sync on update",
            {
              error: error instanceof Error ? error.message : String(error),
            }
          );
        }
      });

      logWithContext(
        "info",
        "[SubscriptionService] CustomerInfo listener registered"
      );
    } catch (error) {
      logWithContext(
        "error",
        "[SubscriptionService] Failed to setup listener",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * アプリ復帰時のリスナー設定
   * 外部での解約・変更に対応
   */
  private async setupAppStateListener(): Promise<void> {
    try {
      App.addListener("appStateChange", async ({ isActive }) => {
        if (!isActive) return;

        try {
          logWithContext(
            "info",
            "[SubscriptionService] App resumed, syncing..."
          );

          const { customerInfo } = await Purchases.getCustomerInfo();
          await this.syncWithServer(customerInfo);

          logWithContext("info", "[SubscriptionService] Synced on app resume");
        } catch (error) {
          logWithContext(
            "error",
            "[SubscriptionService] Failed to sync on resume",
            {
              error: error instanceof Error ? error.message : String(error),
            }
          );
        }
      });

      logWithContext(
        "info",
        "[SubscriptionService] App state listener registered"
      );
    } catch (error) {
      logWithContext(
        "error",
        "[SubscriptionService] Failed to setup app listener",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * サーバーと購読状態を同期
   * ClientStore の changePlan を呼び出してプラン変更を委譲
   */
  private async syncWithServer(customerInfo: CustomerInfo): Promise<void> {
    try {
      // CustomerInfo から planCode を判定
      const planCode = this.getPlanCodeFromCustomerInfo(customerInfo);

      logWithContext("info", "[SubscriptionService] Syncing with server", {
        planCode,
        entitlements: Object.keys(customerInfo.entitlements.active),
      });

      // ClientStore の changePlanByCode を呼び出す
      // 動的インポートを使用（循環参照を避けるため）
      const clientStore = useClientStore.getState();
      if (!clientStore) {
        logWithContext(
          "error",
          "[SubscriptionService] ClientStore not initialized"
        );
        throw new Error("ClientStore is not initialized");
      }
      const currentPlan = clientStore.currentPlan!;
      if (currentPlan.code !== planCode) {
        logWithContext(
          "info",
          "[SubscriptionService] Changing plan in ClientStore",
          { planCode }
        );
        const { masterData } = useMasterStore.getState();
        if (!masterData) {
          logWithContext(
            "error",
            "[SubscriptionService] Master data not loaded"
          );
          throw new Error("Master data is not loaded");
        }
        const newPlan = masterData.plans.find((p) => p.code === planCode);
        await clientStore.changePlan(newPlan!);
      }

      logWithContext("info", "[SubscriptionService] Synced with server", {
        planCode,
      });
    } catch (error) {
      logWithContext("error", "[SubscriptionService] Server sync failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * CustomerInfo から planCode を判定
   */
  private getPlanCodeFromCustomerInfo(customerInfo: CustomerInfo): string {
    const activeEntitlements = Object.keys(customerInfo.entitlements.active);

    if (activeEntitlements.includes("premium")) return "PREMIUM";
    if (activeEntitlements.includes("standard")) return "STANDARD";

    // 購読なし = FREE
    return "FREE";
  }

  /**
   * RevenueCatにログイン
   */
  async login(userId: string): Promise<void> {
    logWithContext("info", "[SubscriptionService] Logging in", { userId });

    try {
      const { customerInfo } = await Purchases.logIn({ appUserID: userId });

      logWithContext("info", "[SubscriptionService] Login successful", {
        userId,
        entitlements: Object.keys(customerInfo.entitlements.active),
      });

      // ログイン後、サーバーと同期
      await this.syncWithServer(customerInfo);
    } catch (error) {
      logWithContext("error", "[SubscriptionService] Login failed", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  /**
   * RevenueCatからログアウト
   */
  async logout(): Promise<void> {
    logWithContext("info", "[SubscriptionService] Logging out");

    try {
      const { customerInfo } = await Purchases.logOut();

      logWithContext("info", "[SubscriptionService] Logout successful");

      // ログアウト後も状態を同期（匿名ユーザーとして）
      await this.syncWithServer(customerInfo);
    } catch (error) {
      logWithContext("error", "[SubscriptionService] Logout failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 現在のOfferingsを取得
   */
  async getOfferings() {
    logWithContext("info", "[SubscriptionService] Fetching offerings");

    try {
      const offerings = await Purchases.getOfferings();

      if (!offerings.current) {
        logWithContext(
          "error",
          "[SubscriptionService] No current offering available"
        );
        throw new Error("No current offering available");
      }

      logWithContext("info", "[SubscriptionService] Offerings fetched", {
        packages: offerings.current.availablePackages.length,
      });

      return offerings.current;
    } catch (error) {
      logWithContext(
        "error",
        "[SubscriptionService] Failed to fetch offerings",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
      throw error;
    }
  }

  /**
   * プラン購入
   * 購入完了後はリスナーが自動的に syncWithServer → changePlanByCode を呼び出す
   */
  async purchaseAndChangePlan(targetPlan: Plan): Promise<void> {
    logWithContext("info", "[SubscriptionService] Starting purchase", {
      targetPlan: targetPlan.code,
      price: targetPlan.price,
    });

    try {
      // 1. パッケージ識別子を取得
      const packageIdentifier = getPackageIdentifier(targetPlan.code);

      logWithContext("info", "[SubscriptionService] Package identifier", {
        packageIdentifier,
      });

      // 2. Offeringsから該当パッケージを取得
      const offering = await this.getOfferings();
      const targetPackage = offering.availablePackages.find(
        (pkg) => pkg.identifier === packageIdentifier
      );

      if (!targetPackage) {
        logWithContext("error", "[SubscriptionService] Package not found", {
          packageIdentifier,
        });
        throw new Error(`Package not found: ${packageIdentifier}`);
      }

      logWithContext("info", "[SubscriptionService] Package found", {
        identifier: targetPackage.identifier,
        price: targetPackage.product.priceString,
      });

      // 3. RevenueCatで購入実行
      const { customerInfo } = await Purchases.purchasePackage({
        aPackage: targetPackage,
      });

      logWithContext("info", "[SubscriptionService] Purchase successful", {
        entitlements: Object.keys(customerInfo.entitlements.active),
      });

      // 4. リスナーが自動的に syncWithServer → changePlanByCode を呼び出すため、ここでは何もしない
      // changePlan() 側で /api/clients/plan/change を呼び出してサーバーに即時反映する
    } catch (error) {
      logWithContext("error", "[SubscriptionService] Purchase failed", {
        error: error instanceof Error ? error.message : String(error),
        targetPlan: targetPlan.code,
      });
      throw error;
    }
  }

  /**
   * 購入のリストア
   */
  async restorePurchases(): Promise<void> {
    logWithContext("info", "[SubscriptionService] Restoring purchases");

    try {
      const { customerInfo } = await Purchases.restorePurchases();

      logWithContext("info", "[SubscriptionService] Purchases restored", {
        entitlements: Object.keys(customerInfo.entitlements.active),
      });

      // サーバーと同期
      await this.syncWithServer(customerInfo);
    } catch (error) {
      logWithContext("error", "[SubscriptionService] Restore failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Customer Centerまたは購読管理ページを開く
   */
  async openManage(): Promise<void> {
    logWithContext(
      "info",
      "[SubscriptionService] Opening subscription management"
    );

    try {
      // ✅ まずCustomer Centerを表示
      await RevenueCatUI.presentCustomerCenter();

      logWithContext("info", "[SubscriptionService] Customer Center opened");
    } catch (error) {
      // Customer Centerが利用できない場合はmanagementURLにフォールバック
      logWithContext(
        "warn",
        "[SubscriptionService] Customer Center unavailable, using managementURL",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );

      try {
        // CustomerInfoを取得してmanagementURLを使用
        const { customerInfo } = await Purchases.getCustomerInfo();

        // ✅ 正しい型でmanagementURLにアクセス
        const url = customerInfo.managementURL;

        if (url) {
          await Browser.open({ url });
          logWithContext(
            "info",
            "[SubscriptionService] Management URL opened",
            { url }
          );
        } else {
          logWithContext(
            "error",
            "[SubscriptionService] managementURL not available"
          );
          throw new Error("Management URL not available");
        }
      } catch (fallbackError) {
        logWithContext(
          "error",
          "[SubscriptionService] Failed to open management",
          {
            error:
              fallbackError instanceof Error
                ? fallbackError.message
                : String(fallbackError),
          }
        );
        throw fallbackError;
      }
    }
  }

  /**
   * 現在の購読状態を取得
   */
  async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      logWithContext(
        "error",
        "[SubscriptionService] Failed to get customer info",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();
