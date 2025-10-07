import { useLifecycleStore } from "../stores/lifecycle";

/**
 * ライフサイクル管理フック（エイリアス）
 * useLifecycleStore から直接インポートしてもOK
 */
export function useLifecycle() {
  const {
    isInitialized,
    isRefreshing,
    dateChanged,
    lastResumedAt,
    error,
    init,
    setup,
    cleanup,
    onResume,
    onPause,
    clearDateChanged,
    clearError,
    reset,
  } = useLifecycleStore();

  return {
    isInitialized,
    isRefreshing,
    dateChanged,
    lastResumedAt,
    error,
    init,
    setup,
    cleanup,
    onResume,
    onPause,
    clearDateChanged,
    clearError,
    reset,
  };
}
