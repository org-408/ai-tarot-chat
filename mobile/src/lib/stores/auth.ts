import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AppJWTPayload } from "../../../../shared/lib/types";
import { storeRepository } from "../../lib/repositories/store";
import { authService } from "../../lib/services/auth";
import { logWithContext } from "../logger/logger";
import { HttpError, isNetworkError } from "../utils/api-client";
import { useClientStore } from "./client";
import { useMasterStore } from "./master";

interface AuthState {
  // 状態
  isReady: boolean;
  payload: AppJWTPayload | null;
  isAuthenticated: boolean;
  token: string | null;

  // アクション
  init: () => Promise<void>;
  registerDevice: () => Promise<AppJWTPayload>;
  login: () => Promise<AppJWTPayload>;
  logout: () => Promise<AppJWTPayload>;
  refresh: () => Promise<AppJWTPayload>;
  getStoredToken: () => Promise<string | null>;
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
      token: null,

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
            await get().registerDevice();
            logWithContext(
              "info",
              "[AuthStore] Device registration successful:"
            );
          } else {
            set({ token: stored.token });
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
              await get().registerDevice();
            } else {
              // ✅ 整合性OK → 必ずサーバーに検証リクエスト
              logWithContext(
                "info",
                "[AuthStore] Token valid, verifying with server"
              );

              try {
                await get().refresh();

                logWithContext(
                  "info",
                  "[AuthStore] Token verification successful"
                );
              } catch (refreshError) {
                logWithContext("error", "[AuthStore] Refresh error in init:", {
                  error: refreshError,
                });

                // ✅ ネットワークエラーチェック
                if (isNetworkError(refreshError)) {
                  logWithContext(
                    "warn",
                    "[AuthStore] Network error during init, continuing with stored token"
                  );

                  // 既存のトークンで継続
                  set({
                    payload,
                    isAuthenticated: !!payload.user,
                  });
                } else if (refreshError instanceof HttpError) {
                  const status = refreshError.status;

                  logWithContext(
                    "warn",
                    "[AuthStore] Refresh failed, status:",
                    {
                      status,
                    }
                  );

                  // ✅ 401/500 → 再登録
                  if (status === 401 || status === 500) {
                    logWithContext(
                      "warn",
                      "[AuthStore] Token verification failed, re-registering device",
                      { status }
                    );

                    // デバイス再登録（自動的にストレージが上書きされる）
                    await get().registerDevice();
                    logWithContext(
                      "info",
                      "[AuthStore] Device re-registered successfully"
                    );
                  } else {
                    // ✅ その他のHTTPエラー → ログのみ
                    logWithContext(
                      "warn",
                      "[AuthStore] HTTP error during init, continuing with stored token",
                      { status }
                    );

                    // 既存のトークンで継続
                    set({
                      payload,
                      isAuthenticated: !!payload.user,
                    });
                  }
                  const newStored = await authService.getStoredPayload();
                  set({ token: newStored.token });
                } else {
                  // ✅ 不明なエラー → ログのみ
                  logWithContext(
                    "warn",
                    "[AuthStore] Unknown error during init, continuing with stored token",
                    { error: refreshError }
                  );

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
        const newStored = await authService.getStoredPayload();
        set({ token: newStored.token });
      },

      registerDevice: async () => {
        try {
          logWithContext("info", "[AuthStore] Device registration started");
          const payload = await authService.registerDevice();
          set({
            payload,
            isAuthenticated: !!payload.user,
          });
          logWithContext(
            "info",
            "[AuthStore] Device registration successful:",
            {
              clientId: payload.clientId,
              payload,
              isAuthenticated: !!payload.user,
            }
          );
          const stored = await authService.getStoredPayload();
          set({ token: stored.token });
          return payload;
        } catch (error) {
          logWithContext("error", "[AuthStore] Device registration failed:", {
            error,
          });
          throw error;
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

          logWithContext("info", "[AuthStore] Login successful:", {
            clientId: payload.clientId,
            payload,
            isAuthenticated: !!payload.user,
          });

          // currentPlan を同期
          const currentPlan = await useClientStore.getState().currentPlan;
          if (currentPlan!.code === "GUEST") {
            const free = useMasterStore.getState().getPlan("FREE")!;
            useClientStore.getState().setPlan(free);
            logWithContext(
              "info",
              "[AuthStore] Synchronized client plan to FREE after login"
            );
          }
          const stored = await authService.getStoredPayload();
          set({ token: stored.token });
          return payload;
        } catch (error) {
          logWithContext("error", "[AuthStore] Login failed:", { error });
          throw error;
        }
      },

      logout: async () => {
        try {
          logWithContext("info", "[AuthStore] Logout started");

          const payload = await authService.logout();
          set({
            payload,
            isAuthenticated: false,
          });
          logWithContext("info", "[AuthStore] Logout successful");
          const stored = await authService.getStoredPayload();
          set({ token: stored.token });
          return payload;
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
            // TODO: 単純に null を返していいのか要検討
            logWithContext("info", "[AuthStore] No token to refresh");
            throw new Error("No token to refresh");
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
                payload: newPayload,
                isAuthenticated: !!newPayload.user,
              }
            );
            const newStored = await authService.getStoredPayload();
            set({ token: newStored.token });
            return newPayload;
          } catch (refreshError) {
            // ✅ ネットワークエラーチェック
            if (isNetworkError(refreshError)) {
              logWithContext(
                "warn",
                "[AuthStore] Network error during refresh"
              );
              throw refreshError; // ネットワークエラーは上位に伝播
            }

            // ✅ HTTPエラーチェック
            if (refreshError instanceof HttpError) {
              const status = refreshError.status;

              logWithContext("warn", "[AuthStore] Refresh failed, status:", {
                status,
              });

              // ✅ 401/500 → 再登録
              if (status === 401 || status === 500) {
                logWithContext(
                  "warn",
                  "[AuthStore] Token invalid, re-registering device",
                  { status }
                );

                const payload = await get().registerDevice();
                logWithContext(
                  "info",
                  "[AuthStore] Device re-registered successfully",
                  { payload }
                );
                const newStored = await authService.getStoredPayload();
                set({ token: newStored.token });
                return payload; // ✅ 成功として扱う
              }

              // ✅ その他のHTTPエラー → 再throw
              logWithContext("error", "[AuthStore] HTTP error during refresh");
              throw refreshError;
            }

            // ✅ 不明なエラー → 再throw
            logWithContext("error", "[AuthStore] Unknown error during refresh");
            throw refreshError;
          }
        } catch (error) {
          logWithContext("error", "[AuthStore] Refresh failed:", { error });
          throw error; // ✅ エラーを上位に伝播
        }
      },

      getStoredToken: async () => {
        const { token } = await authService.getStoredPayload();
        return token;
      },

      setPayload: (payload: AppJWTPayload) => {
        set({
          payload,
          isAuthenticated: !!payload.user,
        });
        logWithContext("info", "[AuthStore] Payload updated:", {
          payload,
          isAuthenticated: !!payload.user,
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
