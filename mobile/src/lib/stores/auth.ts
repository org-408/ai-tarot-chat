import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AppJWTPayload } from "../../../../shared/lib/types";
import { storeRepository } from "../../lib/repositories/store";
import { authService } from "../../lib/services/auth";
import { logWithContext } from "../logger/logger";
import { subscriptionService } from "../services/subscription";

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
  isAuthenticated: boolean;

  // アクション
  init: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setPayload: (payload: AppJWTPayload) => void;
  reset: () => void;
}

/**
 * 認証ストア
 *
 * 純粋な認証のみを管理
 * - デバイス登録
 * - OAuth ログイン
 * - トークン更新
 *
 * ⚠️ Plan 情報は payload.planCode から導出（Client が管理）
 * ⚠️ プラン変更は useClientStore が管理
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isReady: false,
      payload: null,
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
                isAuthenticated: !!newPayload.user,
              });
            } else {
              // ✅ 整合性OK → 必ずサーバーに検証リクエスト
              logWithContext(
                "info",
                "[AuthStore] Token valid, verifying with server"
              );

              try {
                await get().refresh();
              } catch (refreshError) {
                logWithContext("error", "[AuthStore] Refresh error in init:", {
                  error: refreshError,
                });

                const error = refreshError as HttpError;
                const status = error.status || error.response?.status;

                logWithContext("warn", "[AuthStore] Refresh failed, status:", {
                  status,
                });

                // ✅ status が取れない場合も再登録（安全側に倒す）
                if (!status || status === 401 || status === 500) {
                  logWithContext(
                    "warn",
                    "[AuthStore] Token verification failed, re-registering device",
                    { status: status || "unknown" }
                  );

                  // デバイス再登録（自動的にストレージが上書きされる）
                  const newPayload = await authService.registerDevice();
                  set({
                    payload: newPayload,
                    isAuthenticated: !!newPayload.user,
                  });

                  logWithContext(
                    "info",
                    "[AuthStore] Device re-registered successfully"
                  );
                } else {
                  // ✅ 明確なネットワークエラー（502, 503など）→ ログのみ
                  logWithContext(
                    "warn",
                    "[AuthStore] Network error during init, continuing with stored token",
                    { error: error.message, status }
                  );

                  // 既存のトークンで継続
                  set({
                    payload,
                    isAuthenticated: !!payload.user,
                  });
                }
              }
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
            isAuthenticated: !!payload.user,
          });

          // RevenueCatにログイン
          const userId = payload.user?.id;
          if (userId) {
            try {
              const { subscriptionService } = await import(
                "../services/subscription"
              );
              await subscriptionService.login(userId);
              logWithContext("info", "[AuthStore] RevenueCat login successful");
            } catch (rcError) {
              logWithContext(
                "warn",
                "[AuthStore] RevenueCat login failed (non-critical)",
                {
                  error:
                    rcError instanceof Error
                      ? rcError.message
                      : String(rcError),
                }
              );
            }
          }

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

          // RevenueCatからログアウト
          try {
            await subscriptionService.logout();
            logWithContext("info", "[AuthStore] RevenueCat logout successful");
          } catch (rcError) {
            logWithContext(
              "warn",
              "[AuthStore] RevenueCat logout failed (non-critical)",
              {
                error:
                  rcError instanceof Error ? rcError.message : String(rcError),
              }
            );
          }

          await authService.logout();
          set({
            payload: null,
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
          logWithContext(
            "info",
            "[AuthStore] 🔒 Calling authService.refreshToken()"
          );

          try {
            const newPayload = await authService.refreshToken();

            set({
              payload: newPayload,
              isAuthenticated: !!newPayload.user,
            });
            logWithContext(
              "info",
              "[AuthStore] ✅ Token refreshed successfully",
              {
                clientId: newPayload.clientId,
                planCode: newPayload.planCode,
              }
            );
          } catch (refreshError) {
            // ✅ ここでエラーハンドリング
            const error = refreshError as HttpError;
            const status = error.status || error.response?.status;

            logWithContext("warn", "[AuthStore] Refresh failed, status:", {
              status,
            });

            // ✅ 401/500 または status不明 → 再登録
            if (!status || status === 401 || status === 500) {
              logWithContext(
                "warn",
                "[AuthStore] Token invalid, re-registering device",
                { status: status || "unknown" }
              );

              const newPayload = await authService.registerDevice();
              set({
                payload: newPayload,
                isAuthenticated: !!newPayload.user,
              });

              logWithContext(
                "info",
                "[AuthStore] Device re-registered successfully"
              );
              return; // ✅ 成功として扱う
            }

            // ✅ その他のエラー（ネットワークエラーなど）→ 再throw
            logWithContext("error", "[AuthStore] Network error during refresh");
            throw refreshError;
          }

          logWithContext("info", "[AuthStore] Refresh completed");
        } catch (error) {
          logWithContext("error", "[AuthStore] Refresh failed:", { error });
          throw error; // ✅ ネットワークエラーなど回復不能なエラーのみ上位に伝播
        }
      },

      setPayload: (payload: AppJWTPayload) => {
        set({
          payload,
          isAuthenticated: !!payload.user,
        });
        logWithContext("info", "[AuthStore] Payload updated:", {
          planCode: payload.planCode,
        });
      },

      reset: () => {
        logWithContext("info", "[AuthStore] Resetting auth state");
        set({
          isReady: false,
          payload: null,
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
