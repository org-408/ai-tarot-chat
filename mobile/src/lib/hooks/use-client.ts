import { useClientStore } from "../stores/client";

/**
 * Client（ユーザー）情報のフック
 *
 * Auth から Client 情報を取得 + Client Store のアクションを提供
 *
 * ⚠️ プラン変更は useLifecycle().changePlan() を使用すること
 */
export function useClient() {
  const {
    isReady,
    currentPlan,
    usage,
    init,
    refreshUsage,
    checkAndResetIfNeeded,
    decrementOptimistic,
  } = useClientStore();

  return {
    // ============================================
    // 利用状況（Client Store から取得）
    // ============================================
    isReady,
    currentPlan,
    usage,
    remainingReadings: usage?.remainingReadings ?? 0,
    remainingCeltics: usage?.remainingCeltics ?? 0,
    remainingPersonal: usage?.remainingPersonal ?? 0,

    // ============================================
    // アクション
    // ============================================
    init,
    refreshUsage,
    checkAndResetIfNeeded,
    decrementOptimistic,

    // ⚠️ プラン変更は useLifecycle().changePlan() を使用
  };
}
