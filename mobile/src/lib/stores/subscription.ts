import { Capacitor } from "@capacitor/core";
import {
  LOG_LEVEL,
  Purchases,
  type CustomerInfo,
} from "@revenuecat/purchases-capacitor";
import type { Plan } from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { apiClient } from "../utils/apiClient";

export class SubscriptionService {
  /**
   * RevenueCatの初期化
   */
  async initialize(): Promise<void> {
    logWithContext("info", "[SubscriptionService] Initializing RevenueCat");

    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG }); // テスト時はDEBUG

      const platform = Capacitor.getPlatform();

      if (platform === "ios") {
        await Purchases.configure({
          apiKey: import.meta.env.VITE_REVENUECAT_IOS_KEY,
        });
      } else if (platform === "android") {
        await Purchases.configure({
          apiKey: import.meta.env.VITE_REVENUECAT_ANDROID_KEY,
        });
      }

      logWithContext("info", "[SubscriptionService] RevenueCat initialized");
    } catch (error) {
      logWithContext("error", "[SubscriptionService] Init failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Offeringsを取得
   */
  async getOfferings() {
    logWithContext("info", "[SubscriptionService] Fetching offerings");

    try {
      const offerings = await Purchases.getOfferings();

      if (!offerings.current) {
        throw new Error("No current offering available");
      }

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
   * プラン購入処理（RevenueCat → サーバー検証 → プラン変更）
   */
  async purchaseAndChangePlan(
    targetPlan: Plan,
    packageIdentifier: string
  ): Promise<void> {
    logWithContext("info", "[SubscriptionService] Starting purchase", {
      targetPlan: targetPlan.code,
      packageIdentifier,
    });

    try {
      // 1. Offeringsを取得
      const offering = await this.getOfferings();

      // 2. パッケージを取得
      const targetPackage = offering.availablePackages.find(
        (pkg) => pkg.identifier === packageIdentifier
      );

      if (!targetPackage) {
        throw new Error(`Package not found: ${packageIdentifier}`);
      }

      logWithContext("info", "[SubscriptionService] Found package", {
        identifier: targetPackage.identifier,
        price: targetPackage.product.priceString,
      });

      // 3. RevenueCatで購入実行
      const purchaseResult = await Purchases.purchasePackage({
        aPackage: targetPackage,
      });

      logWithContext("info", "[SubscriptionService] Purchase successful", {
        customerInfo: purchaseResult.customerInfo,
      });

      // 4. サーバーに購入情報を送信して検証
      await this.verifyPurchaseOnServer(
        targetPlan.code,
        purchaseResult.customerInfo
      );

      logWithContext(
        "info",
        "[SubscriptionService] Purchase verified on server"
      );
    } catch (error) {
      logWithContext("error", "[SubscriptionService] Purchase failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * サーバー側で購入を検証してプラン変更
   */
  private async verifyPurchaseOnServer(
    planCode: string,
    customerInfo: CustomerInfo
  ): Promise<void> {
    logWithContext(
      "info",
      "[SubscriptionService] Verifying purchase on server"
    );

    try {
      // サーバーに購入情報を送信
      // サーバー側でRevenueCatの購入を検証し、プラン変更を実行
      await apiClient.post("/api/subscriptions/verify", {
        planCode,
        customerInfo,
      });
    } catch (error) {
      logWithContext(
        "error",
        "[SubscriptionService] Server verification failed",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
      throw error;
    }
  }

  /**
   * リストア処理
   */
  async restorePurchases(): Promise<void> {
    logWithContext("info", "[SubscriptionService] Restoring purchases");

    try {
      const { customerInfo } = await Purchases.restorePurchases();

      // サーバー側と同期
      await apiClient.post("/api/subscriptions/sync", {
        customerInfo,
      });

      logWithContext("info", "[SubscriptionService] Purchases restored");
    } catch (error) {
      logWithContext("error", "[SubscriptionService] Restore failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();
