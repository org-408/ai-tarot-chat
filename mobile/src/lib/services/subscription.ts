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
  /**
   * RevenueCatの初期化
   */
  async initialize(): Promise<void> {
    logWithContext("info", "[SubscriptionService] Initializing RevenueCat");

    const platform = Capacitor.getPlatform();

    // Web環境ではスキップ
    if (platform === "web") {
      logWithContext(
        "warn",
        "[SubscriptionService] Skipping initialization on web platform"
      );
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
   * 登録ユーザーIDを取得
   */
  async getAppUserId(): Promise<string> {
    try {
      const result = await Purchases.getAppUserID();
      logWithContext("info", "[SubscriptionService] Fetched App User ID", {
        result,
      });
      return result.appUserID;
    } catch (error) {
      logWithContext(
        "error",
        "[SubscriptionService] Failed to fetch App User ID",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
      throw error;
    }
  }

  /**
   * 匿名ユーザーかどうかを判定
   */
  async isAnonymous(): Promise<boolean> {
    try {
      const result = await Purchases.isAnonymous();
      logWithContext("info", "[SubscriptionService] Checked anonymous status", {
        result,
      });
      return result.isAnonymous;
    } catch (error) {
      logWithContext(
        "error",
        "[SubscriptionService] Failed to check anonymous status",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
      throw error;
    }
  }

  /**
   * 購読状態を取得
   */
  async getCustomerInfo(): Promise<CustomerInfo> {
    logWithContext(
      "info",
      "[SubscriptionService] Checking subscription on resume"
    );

    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      logWithContext("info", "[SubscriptionService] getCustomerInfo fetched", {
        entitlements: Object.keys(customerInfo.entitlements.active),
      });
      return customerInfo;
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
   * CustomerInfo 変更リスナーを handler に設定
   * RevenueCatで購読状態が変更されたらサーバーと同期
   */
  async setupCustomerInfoListener(
    handler: (info: CustomerInfo) => Promise<void> | void
  ): Promise<void> {
    try {
      await Purchases.addCustomerInfoUpdateListener(handler);

      logWithContext(
        "info",
        "[SubscriptionService] CustomerInfo listener registered",
        { handler: handler.name || "anonymous" }
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
   * RevenueCatにログイン
   */
  async login(userId: string): Promise<CustomerInfo> {
    logWithContext("info", "[SubscriptionService] Logging in", { userId });

    try {
      const { customerInfo } = await Purchases.logIn({ appUserID: userId });

      logWithContext("info", "[SubscriptionService] Login successful", {
        userId,
        entitlements: Object.keys(customerInfo.entitlements.active),
      });

      return customerInfo;
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
  async logout(): Promise<CustomerInfo> {
    logWithContext("info", "[SubscriptionService] Logging out");

    try {
      const { customerInfo } = await Purchases.logOut();

      logWithContext("info", "[SubscriptionService] Logout successful", {
        entitlements: Object.keys(customerInfo.entitlements.active),
      });

      // ログアウト後も状態を同期（匿名ユーザーとして）
      return customerInfo;
    } catch (error) {
      logWithContext("error", "[SubscriptionService] Logout failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 現在のOfferings(RevenueCat側のプラン一覧)を取得
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
   * RevenueCatで購入処理を行う
   */
  async purchase(targetPlan: Plan): Promise<CustomerInfo> {
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

      return customerInfo;
    } catch (error) {
      logWithContext("error", "[SubscriptionService] Purchase failed", {
        error: error instanceof Error ? error.message : String(error),
        targetPlan: targetPlan.code,
      });
      throw error;
    }
  }

  /**
   * 購入のリストア ＝ 購入を復元するために用意しておく
   */
  async restorePurchases(): Promise<CustomerInfo> {
    logWithContext("info", "[SubscriptionService] Restoring purchases");

    try {
      const { customerInfo } = await Purchases.restorePurchases();

      logWithContext("info", "[SubscriptionService] Purchases restored", {
        entitlements: Object.keys(customerInfo.entitlements.active),
      });

      return customerInfo;
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
      // 初期化必須とする
      await this.initialize();
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
}

export const subscriptionService = new SubscriptionService();
