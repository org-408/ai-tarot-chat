import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storeRepository } from '../../lib/repositories/store';
import { authService } from '../../lib/services/auth';
import { decodeJWT } from '../../lib/utils/jwt';
import type { JWTPayload } from '../../../../shared/lib/types';
import type { UserPlan } from '../../types';

const JWT_SECRET = import.meta.env.VITE_AUTH_SECRET;

interface AuthState {
  payload: JWTPayload | null;
  plan: UserPlan;
  isAuthenticated: boolean;
  
  // アクション
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setPayload: (payload: JWTPayload) => void;
}

/**
 * 認証ストア
 * - JWTペイロード管理
 * - プラン情報管理
 * - ログイン/ログアウト
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      payload: null,
      plan: 'GUEST',
      isAuthenticated: false,
      
      login: async () => {
        try {
          console.log('[AuthStore] Login started');
          const payload = await authService.signInWithWeb();
          set({
            payload,
            plan: payload.planCode as UserPlan,
            isAuthenticated: !!payload.user,
          });
          console.log('[AuthStore] Login successful:', payload.planCode);
        } catch (error) {
          console.error('[AuthStore] Login failed:', error);
          throw error;
        }
      },
      
      logout: async () => {
        try {
          console.log('[AuthStore] Logout started');
          await authService.logout();
          set({
            payload: null,
            plan: 'GUEST',
            isAuthenticated: false,
          });
          console.log('[AuthStore] Logout successful');
        } catch (error) {
          console.error('[AuthStore] Logout failed:', error);
          throw error;
        }
      },
      
      refresh: async () => {
        try {
          console.log('[AuthStore] Refresh started');
          const token = await storeRepository.get<string>('accessToken');
          
          if (!token) {
            console.log('[AuthStore] No token found');
            return;
          }
          
          const payload = await decodeJWT<JWTPayload>(token, JWT_SECRET);
          
          if (!payload) {
            console.log('[AuthStore] Invalid token');
            return;
          }
          
          set({
            payload,
            plan: payload.planCode as UserPlan,
            isAuthenticated: !!payload.user,
          });
          console.log('[AuthStore] Refresh successful:', payload.planCode);
        } catch (error) {
          console.error('[AuthStore] Refresh failed:', error);
        }
      },
      
      setPayload: (payload: JWTPayload) => {
        set({
          payload,
          plan: payload.planCode as UserPlan,
          isAuthenticated: !!payload.user,
        });
        console.log('[AuthStore] Payload updated:', payload.planCode);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          const value = await storeRepository.get(name);
          return value ? JSON.stringify(value) : null;
        },
        setItem: async (name: string, value: string) => {
          const parsed = JSON.parse(value);
          await storeRepository.set(name, parsed);
        },
        removeItem: async (name: string) => {
          await storeRepository.delete(name);
        },
      })),
    }
  )
);

/**
 * 便利なセレクター
 */
export const useAuth = () => {
  const { payload, plan, isAuthenticated, login, logout, refresh, setPayload } = useAuthStore();
  
  return {
    payload,
    plan,
    isAuthenticated,
    userId: payload?.user?.id,
    login,
    logout,
    refresh,
    setPayload,
  };
};