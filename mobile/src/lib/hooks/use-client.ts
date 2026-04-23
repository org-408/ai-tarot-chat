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
    usage,
    currentPlan,
    readings,
    readingsTotal,
    take,
    skip,
    error,
    init,
    debugSetPlan,
    refreshUsage,
    checkAndResetIfNeeded,
    fetchReadings,
    invalidateReadings,
    markOnboarded,
    resetOnboarding,
  } = useClientStore();

  return {
    // ============================================
    // 利用状況（Client Store から取得）
    // ============================================
    isReady,
    currentPlan: usage?.plan ?? currentPlan,
    usage,
    remainingReadings: usage?.remainingReadings ?? 0,
    remainingPersonal: usage?.remainingPersonal ?? 0,
    readings,
    readingsTotal,
    take,
    skip,
    error,

    // ============================================
    // オンボーディング
    // ============================================
    quickOnboardedAt: usage?.quickOnboardedAt ?? null,
    personalOnboardedAt: usage?.personalOnboardedAt ?? null,

    // ============================================
    // アクション
    // ============================================
    init,
    debugSetPlan,
    refreshUsage,
    checkAndResetIfNeeded,
    fetchReadings,
    invalidateReadings,
    markOnboarded,
    resetOnboarding,
  };
}
