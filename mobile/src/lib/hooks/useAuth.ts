import { useAuthStore } from '../stores/auth';

/**
 * 認証フック（エイリアス）
 * useAuthStore から直接インポートしてもOK
 */
export function useAuth() {
  const { payload, plan, isAuthenticated, login, logout, refresh, setPayload } = useAuthStore();
  
  return {
    payload,
    plan,
    isAuthenticated,
    userId: payload?.user?.id,
    email: payload?.user?.email,
    login,
    logout,
    refresh,
    setPayload,
  };
}