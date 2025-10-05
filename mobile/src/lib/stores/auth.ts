import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storeRepository } from '../../lib/repositories/store';
import { authService } from '../../lib/services/auth';
import { decodeJWT } from '../../lib/utils/jwt';
import type { JWTPayload } from '../../../../shared/lib/types';
import type { UserPlan } from '../../types';
import { clientService } from '../services/client';
import { apiClient } from '../utils/apiClient';
import { App as CapacitorApp } from '@capacitor/app';

const JWT_SECRET = import.meta.env.VITE_AUTH_SECRET;

interface AuthState {
  // 状態
  isReady: boolean;
  payload: JWTPayload | null;
  plan: UserPlan;
  isAuthenticated: boolean;
  
  // アクション
  init: () => Promise<void>;
  setupAppLifecycle: () => void;
  cleanupAppLifecycle: () => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setPayload: (payload: JWTPayload) => void;
  changePlan: (newPlanCode: string) => Promise<void>;
}

// 🔥 リスナーを保持するための変数（ストアの外）
let appStateListener: any = null;
let resumeListener: any = null;
let visibilityHandler: (() => void) | null = null;

/**
 * 認証ストア
 * - JWTペイロード管理
 * - プラン情報管理
 * - ログイン/ログアウト
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isReady: false,
      payload: null,
      plan: 'GUEST',
      isAuthenticated: false,
      
      init: async () => {
        try {
          console.log('[AuthStore] Initialization started');
          set({ isReady: false });
          const token = await storeRepository.get<string>('accessToken');
          const storedDeviceId = await storeRepository.get<string>('deviceId');
          const storedClientId = await storeRepository.get<string>('clientId');
          const storedUserId = await storeRepository.get<string>('userId');
          console.log('[AuthStore] Stored values:', { token, storedDeviceId, storedClientId, storedUserId });
          
          // アプリがダウンロードされた直後から順を追って実装
          if(!token) {
            // ダウンロード直後・トークン破損状態を想定
            // サーバー側で新規デバイス登録 or 既存デバイス認識を行い、新しいトークンを発行
            console.log('[AuthStore] No token found, registering device');
            const payload = await authService.registerDevice();
            set({
              payload,
              plan: payload.planCode as UserPlan,
              isAuthenticated: !!payload.user,
            });
            console.log('[AuthStore] Device registration successful:', payload.planCode);
          } else {
            const payload = await decodeJWT<JWTPayload>(token, JWT_SECRET);
            if (payload && payload.t !== 'app' || payload.deviceId !== storedDeviceId || payload.clientId !== storedClientId || (payload.user?.id || null) !== storedUserId) {
              // 一致しない場合は、異常ケースとして、再登録の処理へ
              // TODO: ユーザーのデータ引き継ぎ・復元に対する機能を検討
              console.log('[AuthStore] Device ID mismatch, re-registering device');
              const newPayload = await authService.registerDevice();
              set({
                payload: newPayload,
                plan: newPayload.planCode as UserPlan,
                isAuthenticated: !!newPayload.user,
              });
              console.log('[AuthStore] Device re-registration successful:', newPayload.planCode);
            } else {
              // デバイス情報OK、トークン有効期限チェック
              console.log('[AuthStore] Valid token found, checking expiration');
              await get().refresh();
              console.log('[AuthStore] Token refresh (if needed) completed');
            }
          }
          set({ isReady: true });
          console.log('[AuthStore] Initialization completed');
        } catch (error) {
          console.error('[AuthStore] Initialization failed:', error);
        }
      },

      // 🔥 アプリライフサイクルリスナーの設定
      setupAppLifecycle: () => {
        console.log('[AuthStore] Setting up app lifecycle listeners');
        
        // すでに設定されている場合はクリーンアップ
        get().cleanupAppLifecycle();
        
        // 1. Capacitor: appStateChange
        CapacitorApp.addListener('appStateChange', async (state) => {
          if (state.isActive) {
            console.log('[AuthStore] App resumed (appStateChange)');
            try {
              await get().refresh();
            } catch (error) {
              console.error('[AuthStore] Refresh on appStateChange failed:', error);
            }
          }
        }).then(listener => {
          appStateListener = listener;
        });

        // 2. Capacitor: resume
        CapacitorApp.addListener('resume', async () => {
          console.log('[AuthStore] App resumed (resume event)');
          try {
            await get().refresh();
          } catch (error) {
            console.error('[AuthStore] Refresh on resume failed:', error);
          }
        }).then(listener => {
          resumeListener = listener;
        });

        // 3. Web/PWA: visibilitychange
        visibilityHandler = async () => {
          if (document.visibilityState === 'visible') {
            console.log('[AuthStore] Document visible');
            try {
              await get().refresh();
            } catch (error) {
              console.error('[AuthStore] Refresh on visibility failed:', error);
            }
          }
        };
        document.addEventListener('visibilitychange', visibilityHandler);
      },

      // 🔥 アプリライフサイクルリスナーのクリーンアップ
      cleanupAppLifecycle: () => {
        console.log('[AuthStore] Cleaning up app lifecycle listeners');
        
        if (appStateListener) {
          appStateListener.remove();
          appStateListener = null;
        }
        
        if (resumeListener) {
          resumeListener.remove();
          resumeListener = null;
        }
        
        if (visibilityHandler) {
          document.removeEventListener('visibilitychange', visibilityHandler);
          visibilityHandler = null;
        }
      },

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
          apiClient.clearTokenCache(); // キャッシュクリア
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
          const isExpired = payload.exp && Date.now() >= payload.exp * 1000;
          
          if (isExpired) {
            console.log('[AuthStore] Token expired, refreshing from server');
            const newPayload = await authService.refreshToken();
            set({
              payload: newPayload,
              plan: newPayload.planCode as UserPlan,
              isAuthenticated: !!newPayload.user,
            });
          } else {
            set({
              payload,
              plan: payload.planCode as UserPlan,
              isAuthenticated: !!payload.user,
            });
          }
          console.log('[AuthStore] Refresh successful');
        } catch (error) {
          console.error('[AuthStore] Refresh failed:', error);
          throw error;
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

      changePlan: async (newPlanCode: string) => {
        try {
          console.log('[AuthStore] Change plan started:', newPlanCode);
          // TODO: 認証必須にする場合はコメントアウトを外す
          // if (!get().isAuthenticated) {
          //   throw new Error('Authentication required to change plan');
          // }
          const result = await clientService.changePlan(newPlanCode);
          set({
            payload: result.payload,
            plan: result.payload.planCode as UserPlan,
            isAuthenticated: !!result.payload.user,
          });
          console.log('[AuthStore] Change plan successful:', result.payload.planCode);
        } catch (error) {
          console.error('[AuthStore] Change plan failed:', error);
          throw error;
        }
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