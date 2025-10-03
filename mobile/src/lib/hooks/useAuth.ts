import { useAuthStore } from '../stores/auth';

/**
 * 認証フック（エイリアス）
 * useAuthStore から直接インポートしてもOK
 */
export function useAuth() {
  const { isReady, payload, plan, isAuthenticated, init, login, logout, refresh, setPayload, changePlan } = useAuthStore();
  
  return {
    isReady,
    payload,
    plan,
    isAuthenticated,
    userId: payload?.user?.id,
    email: payload?.user?.email,
    init,
    login,
    logout,
    refresh,
    setPayload,
    changePlan,
  };
}