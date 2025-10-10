import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AppJWTPayload } from "../../../../shared/lib/types";
import { storeRepository } from "../../lib/repositories/store";
import { authService } from "../../lib/services/auth";
import type { UserPlan } from "../../types";
import { logWithContext } from "../logger/logger";
import { clientService } from "../services/client";
import { apiClient } from "../utils/apiClient";

interface HttpError extends Error {
  status?: number;
  response?: {
    status?: number;
  };
}

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

          const stored = await authService.getStoredPayload();
          logWithContext("info", "[AuthStore] Stored values:", { stored });

          if (!stored.token) {
            // トークンなし → デバイス登録
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
              {
                planCode: payload.planCode,
              }
            );
          } else {
            // トークンあり → デコード & 整合性チェック
            const payload = await authService.decodeStoredToken(stored.token);
            logWithContext("info", "[AuthStore] Decoded token payload:", {
              payload,
            });

            if (
              payload.t !== "app" ||
              payload.deviceId !== stored.deviceId ||
              payload.clientId !== stored.clientId ||
              (payload.user != null && payload.user.id !== stored.userId)
            ) {
              // 整合性エラー → 再登録
              logWithContext(
                "info",
                "[AuthStore] Token mismatch, re-registering device"
              );
              const newPayload = await authService.registerDevice();
              set({
                payload: newPayload,
                plan: newPayload.planCode as UserPlan,
                isAuthenticated: !!newPayload.user,
              });
            } else {
              // ✅ 整合性OK → 必ずサーバーに検証リクエスト
              logWithContext(
                "info",
                "[AuthStore] Token valid, verifying with server"
              );
              await get().refresh();
            }
          }

          set({ isReady: true });
          logWithContext("info", "[AuthStore] Initialization completed");
        } catch (error) {
          logWithContext("error", "[AuthStore] Initialization failed:", {
            error,
          });
          set({ isReady: true }); // エラーでも isReady は true にする
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

          const stored = await authService.getStoredPayload();

          if (!stored.token) {
            logWithContext("info", "[AuthStore] No token to refresh");
            return;
          }

          // ✅ 常にサーバーに検証リクエスト
          logWithContext("info", "[AuthStore] Refreshing token from server");

          try {
            const newPayload = await authService.refreshToken();
            set({
              payload: newPayload,
              plan: newPayload.planCode as UserPlan,
              isAuthenticated: !!newPayload.user,
            });
            logWithContext("info", "[AuthStore] Token refreshed successfully");
          } catch (refreshError) {
            const error = refreshError as HttpError;

            // ✅ 401エラー（Device not found）→ 例外をスロー
            if (error.status === 401 || error.response?.status === 401) {
              logWithContext(
                "error",
                "[AuthStore] Token invalid (401), need to re-register"
              );
              throw new Error("Token invalid, device not found on server");
            }

            // ✅ その他のエラー（ネットワークエラーなど）→ 例外をスロー
            logWithContext("error", "[AuthStore] Server unavailable", {
              error: error.message,
              status: error.status,
            });

            throw new Error("Network error: unable to verify token");
          }

          logWithContext("info", "[AuthStore] Refresh completed");
        } catch (error) {
          logWithContext("error", "[AuthStore] Refresh failed:", { error });
          throw error; // ✅ 上位（init）に伝播
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
