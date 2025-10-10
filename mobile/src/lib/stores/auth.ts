import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AppJWTPayload } from "../../../../shared/lib/types";
import { storeRepository } from "../../lib/repositories/store";
import { authService } from "../../lib/services/auth";
import type { UserPlan } from "../../types";
import { logWithContext } from "../logger/logger";
import { clientService } from "../services/client";
import { apiClient } from "../utils/apiClient";

interface AuthState {
  // 状態
  isReady: boolean;
  payload: AppJWTPayload | null;
  plan: UserPlan;
  isAuthenticated: boolean;

  // アクション
  init: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setPayload: (payload: AppJWTPayload) => void;
  changePlan: (newPlanCode: string) => Promise<void>;
  reset: () => void;
}

/**
 * 認証ストア
 * ⚠️ ストレージアクセスは authService 経由で行う
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isReady: false,
      payload: null,
      plan: "GUEST",
      isAuthenticated: false,

      init: async () => {
        try {
          logWithContext("info", "[AuthStore] Initialization started");
          set({ isReady: false });

          // ✅ authService 経由でストレージにアクセス
          const stored = await authService.getStoredPayload();
          logWithContext("info", "[AuthStore] Stored values:", { stored });

          // アプリがダウンロードされた直後から順を追って実装
          if (!stored.token) {
            // ダウンロード直後・トークン破損状態を想定
            // サーバー側で新規デバイス登録 or 既存デバイス認識を行い、新しいトークンを発行
            logWithContext(
              "info",
              "[AuthStore] No token found, registering device"
            );
            const payload = await authService.registerDevice();
            set({
              payload,
              plan: payload.planCode as UserPlan,
              isAuthenticated: !!payload.user,
            });
            logWithContext(
              "info",
              "[AuthStore] Device registration successful:",
              { planCode: payload.planCode }
            );
          } else {
            // ✅ authService 経由でデコード
            const payload = await authService.decodeStoredToken(stored.token);
            logWithContext("info", "[AuthStore] Decoded token payload:", {
              payload,
            });

            // トークンの整合性チェック
            if (
              (payload && payload.t !== "app") ||
              payload.deviceId !== stored.deviceId ||
              payload.clientId !== stored.clientId ||
              (payload.user != null && payload.user.id !== stored.userId)
            ) {
              // 一致しない場合は、異常ケースとして、再登録の処理へ
              // TODO: ユーザーのデータ引継ぎ・復元に対する機能を検討
              logWithContext(
                "info",
                "[AuthStore] Device ID mismatch, re-registering device"
              );
              const newPayload = await authService.registerDevice();
              set({
                payload: newPayload,
                plan: newPayload.planCode as UserPlan,
                isAuthenticated: !!newPayload.user,
              });
              logWithContext(
                "info",
                "[AuthStore] Device re-registration successful:",
                { planCode: newPayload.planCode }
              );
            } else {
              // デバイス情報OK、トークン有効期限チェック
              logWithContext(
                "info",
                "[AuthStore] Valid token found, checking expiration"
              );
              await get().refresh();
              logWithContext(
                "info",
                "[AuthStore] Token refresh (if needed) completed"
              );
            }
          }
          set({ isReady: true });
          logWithContext("info", "[AuthStore] Initialization completed");
        } catch (error) {
          logWithContext("error", "[AuthStore] Initialization failed:", {
            error,
          });
        }
      },

      login: async () => {
        try {
          logWithContext("info", "[AuthStore] Login started");
          const payload = await authService.signInWithWeb();
          set({
            payload,
            plan: payload.planCode as UserPlan,
            isAuthenticated: !!payload.user,
          });
          logWithContext("info", "[AuthStore] Login successful:", {
            planCode: payload.planCode,
          });
        } catch (error) {
          logWithContext("error", "[AuthStore] Login failed:", { error });
          throw error;
        }
      },

      logout: async () => {
        try {
          logWithContext("info", "[AuthStore] Logout started");
          await authService.logout();
          apiClient.clearTokenCache();
          set({
            payload: null,
            plan: "GUEST",
            isAuthenticated: false,
          });
          logWithContext("info", "[AuthStore] Logout successful");
        } catch (error) {
          logWithContext("error", "[AuthStore] Logout failed:", { error });
          throw error;
        }
      },

      refresh: async () => {
        try {
          logWithContext("info", "[AuthStore] Refresh started");

          // ✅ authService 経由でトークン取得
          const stored = await authService.getStoredPayload();

          if (!stored.token) {
            logWithContext("info", "[AuthStore] No token to refresh");
            return;
          }

          // ✅ authService 経由でデコード
          const payload = await authService.decodeStoredToken(stored.token);
          const isExpired = authService.isTokenExpired(payload);

          if (isExpired) {
            logWithContext(
              "info",
              "[AuthStore] Token expired, refreshing from server"
            );
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

          logWithContext("info", "[AuthStore] Refresh successful");
        } catch (error) {
          logWithContext("error", "[AuthStore] Refresh failed:", { error });
          throw error;
        }
      },

      setPayload: (payload: AppJWTPayload) => {
        set({
          payload,
          plan: payload.planCode as UserPlan,
          isAuthenticated: !!payload.user,
        });
        logWithContext("info", "[AuthStore] Payload updated:", {
          planCode: payload.planCode,
        });
      },

      changePlan: async (newPlanCode: string) => {
        try {
          logWithContext("info", "[AuthStore] Change plan started:", {
            newPlanCode,
          });
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
          logWithContext("info", "[AuthStore] Change plan successful:", {
            planCode: result.payload.planCode,
          });
        } catch (error) {
          logWithContext("error", "[AuthStore] Change plan failed:", { error });
          throw error;
        }
      },

      reset: () => {
        logWithContext("info", "[AuthStore] Resetting auth state");
        set({
          isReady: false,
          payload: null,
          plan: "GUEST",
          isAuthenticated: false,
        });
      },
    }),

    {
      name: "auth-storage",
      // ⚠️ Persist middleware だけは storeRepository を直接使う（これはOK）
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
