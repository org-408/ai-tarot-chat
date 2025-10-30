import { useLifecycleStore } from "../stores/lifecycle";

/**
 * ライフサイクル管理フック
 *
 * アプリ全体のライフサイクル（初期化・レジューム）を管理
 */
export function useLifecycle() {
  const {
    // 基本状態
    isInitialized,
    isRefreshing,
    dateChanged,
    lastResumedAt,
    isChangingPlan,
    planChangeError,
    error,

    // ✅ デバッグ用状態
    currentStep,
    lastError,

    // ✅ オフライン状態
    isOffline,
    offlineMode,

    // アクション
    init,
    setup,
    cleanup,
    onResume,
    onPause,
    clearDateChanged,
    clearError,
    login,
    logout,
    changePlan,
    reset,

    // ✅ ヘルパー
    getStepLabel,
    getOfflineModeLabel,
  } = useLifecycleStore();

  return {
    // 基本状態
    isInitialized,
    isRefreshing,
    dateChanged,
    lastResumedAt,
    isChangingPlan,
    planChangeError,
    error,

    // ✅ デバッグ用状態
    currentStep,
    lastError,

    // ✅ オフライン状態
    isOffline,
    offlineMode,

    // アクション
    init,
    setup,
    cleanup,
    onResume,
    onPause,
    login,
    logout,
    changePlan,
    clearDateChanged,
    clearError,
    reset,

    // ✅ ヘルパー
    getStepLabel,
    getOfflineModeLabel,
  };
}
