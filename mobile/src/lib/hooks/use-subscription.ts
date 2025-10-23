import { useSubscriptionStore } from "../stores/subscription";

/**
 * Subscription(RevenueCat)情報フック
 *
 * グローバルに使えるSubscription情報
 *
 * ⚠️ 初期化は lifecycle.ts が管理
 * このフックは単にストアの状態を返すだけ
 */
export function useSubscription() {
  const {
    isInitialized,
    isLoggedIn,
    customerInfo,
    isPurchasing,
    purchaseError,
    init,
    listener,
    login,
    logout,
    purchasePlan,
    restorePurchases,
    refreshCustomerInfo,
    openManage,
    clearError,
    reset,
  } = useSubscriptionStore();

  return {
    // 状態
    isInitialized,
    isLoggedIn,
    isPurchasing,
    purchaseError,

    // データ
    customerInfo,

    // アクション（主にリフレッシュやバージョンチェック用）
    init,
    listener,
    login,
    logout,
    purchasePlan,
    restorePurchases,
    refreshCustomerInfo,
    openManage,
    clearError,
    reset,
  };
}
