import { useAuthStore } from '../stores/auth';

/**
 * 認証フック（エイリアス）
 * useAuthStore から直接インポートしてもOK
 */
export function useAuth() {
  const {
    isReady,
    payload,
    plan,
    isAuthenticated,
    init,
    setupAppLifecycle,
    cleanupAppLifecycle,
    login,
    logout,
    refresh,
    setPayload,
    changePlan
  } = useAuthStore();

  return {
    isReady,
    payload,
    plan,
    isAuthenticated,
    clientId: payload?.clientId || null,
    userId: payload?.user?.id || null,
    email: payload?.user?.email || null,
    init,
    setupAppLifecycle,
    cleanupAppLifecycle,
    login,
    logout,
    refresh,
    setPayload,
    changePlan,
  };
}