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
    currentInitStep,
    currentResumeStep,
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
    logout,
    changePlan,
    reset,

    // ✅ ヘルパー
    getInitStepLabel,
    getResumeStepLabel,
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
    currentInitStep,
    currentResumeStep,
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
    logout,
    changePlan,
    clearDateChanged,
    clearError,
    reset,

    // ✅ ヘルパー
    getInitStepLabel,
    getResumeStepLabel,
    getOfflineModeLabel,
  };
}
