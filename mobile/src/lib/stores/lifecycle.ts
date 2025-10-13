import { App as CapacitorApp } from "@capacitor/app";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";
import { authService } from "../services/auth";
import { useAuthStore } from "./auth";

interface HttpError extends Error {
  status?: number;
  response?: {
    status?: number;
  };
}

interface LifecycleState {
  // 状態
  isInitialized: boolean;
  isRefreshing: boolean;
  dateChanged: boolean;
  lastResumedAt: Date | null;
  error: Error | null;

  // アクション
  init: () => Promise<void>;
  setup: () => void;
  cleanup: () => void;
  onResume: () => Promise<void>;
  onPause: () => Promise<void>;
  clearDateChanged: () => void;
  clearError: () => void;
  reset: () => void;
}

import type { PluginListenerHandle } from "@capacitor/core";
import { useClientStore } from "./client";

let appStateListener: PluginListenerHandle | null = null;

// ✅ メモリ上のPromiseキャッシュ(競合状態を完全に防ぐ)
let initPromise: Promise<void> | null = null;

export const useLifecycleStore = create<LifecycleState>()(
  persist(
    (set, get) => ({
      isInitialized: false,
      isRefreshing: false,
      dateChanged: false,
      lastResumedAt: null,
      error: null,

      /**
       * アプリ起動時の初期化
       *
       * ✅ Promiseキャッシュで競合状態を完全に防止
       * - 最初の呼び出しでPromiseを作成
       * - 2回目以降は即座に同じPromiseを返す(チェックと返却がアトミック)
       */
      init: async () => {
        // ✅ 既にPromiseがある場合は即座に返す(アトミック操作)
        if (initPromise) {
          logWithContext(
            "info",
            "[Lifecycle] Init already in progress, reusing promise"
          );
          return initPromise;
        }

        // ✅ 既に初期化完了している場合
        if (get().isInitialized) {
          logWithContext("info", "[Lifecycle] Already initialized, skipping");
          return;
        }

        logWithContext("info", "[Lifecycle] Initializing...");

        // ✅ Promiseを作成して即座に代入(これがロック)
        initPromise = (async () => {
          try {
            set({
              isRefreshing: true,
              error: null,
            });

            // ========================================
            // 認証初期化の実行
            // ========================================
            logWithContext("info", "[Lifecycle] Initializing auth");
            await useAuthStore.getState().init();

            // ========================================
            // 利用状況初期化の実行
            // ========================================
            logWithContext("info", "[Lifecycle] Initializing client");
            await useClientStore.getState().init();

            // ✅ 初期化完了
            set({
              isInitialized: true,
              isRefreshing: false,
              lastResumedAt: new Date(),
            });

            logWithContext("info", "[Lifecycle] Initialization complete", {
              isReady: useAuthStore.getState().isReady,
              clientId: useAuthStore.getState().payload?.clientId,
            });
          } catch (error) {
            logWithContext("error", "[Lifecycle] Initialization failed", {
              error,
            });

            set({
              isInitialized: true,
              isRefreshing: false,
              error: error as Error,
            });
          } finally {
            // ✅ Promiseを解放(次回起動時に再初期化可能に)
            initPromise = null;
          }
        })();

        return initPromise;
      },

      setup: () => {
        logWithContext("info", "[Lifecycle] Setting up listeners");
        get().cleanup();

        CapacitorApp.addListener("appStateChange", async (state) => {
          if (state.isActive) {
            await get().onResume();
          } else {
            await get().onPause();
          }
        }).then((listener) => {
          appStateListener = listener;
        });
      },

      cleanup: () => {
        logWithContext("info", "[Lifecycle] Cleaning up listeners");

        if (appStateListener) {
          appStateListener.remove();
          appStateListener = null;
        }
      },

      onResume: async () => {
        logWithContext("info", "[Lifecycle] App resumed");

        const { isInitialized } = get();

        // 初期化中の場合はスキップ
        if (initPromise) {
          logWithContext(
            "info",
            "[Lifecycle] Init in progress, skipping onResume"
          );
          return;
        }

        // まだ初期化されていない
        if (!isInitialized) {
          logWithContext("info", "[Lifecycle] Not initialized, running init()");
          await get().init();
          return;
        }

        const previousDate = get().lastResumedAt;
        const currentDate = new Date();

        set({
          isRefreshing: true,
          dateChanged: false,
          error: null,
        });

        try {
          const authStore = useAuthStore.getState();

          // ========================================
          // 1. 認証トークンのリフレッシュ
          // ========================================
          logWithContext("info", "[Lifecycle] Refreshing auth token");

          try {
            await authStore.refresh();
          } catch (refreshError) {
            const error = refreshError as HttpError;
            const status = error.status || error.response?.status;

            // ✅ 401 または 500 → 再登録で救済
            if (!status || status === 401 || status === 500) {
              logWithContext(
                "warn",
                `[Lifecycle] Server returned ${status}, re-registering device`,
                { status }
              );

              // デバイス再登録（自動的にストレージが上書きされる）
              const newPayload = await authService.registerDevice();
              authStore.setPayload(newPayload);

              logWithContext(
                "info",
                "[Lifecycle] Device re-registered successfully"
              );
            } else {
              // ✅ その他のエラー（ネットワークエラーなど） → ログのみでスキップ
              logWithContext(
                "warn",
                "[Lifecycle] Failed to refresh token, but continuing",
                { error: error.message }
              );
            }
            // ========================================
            // 2. 利用状況のリフレッシュ
            // ========================================
            const clientStore = useClientStore.getState();
            if (authStore.isAuthenticated && clientStore.isReady) {
              logWithContext("info", "[Lifecycle] Refreshing client usage");
              try {
                await clientStore.refreshUsage();
              } catch (usageError) {
                logWithContext(
                  "warn",
                  "[Lifecycle] Failed to refresh usage, but continuing",
                  {
                    error:
                      usageError instanceof Error
                        ? usageError.message
                        : String(usageError),
                  }
                );
              }
            } else {
              logWithContext(
                "info",
                "[Lifecycle] Skipping usage refresh, not authenticated or client not ready"
              );
            }
          }

          // 日付変更の検出
          const dateChanged =
            previousDate !== null &&
            previousDate.toDateString() !== currentDate.toDateString();

          if (dateChanged) {
            logWithContext("info", "[Lifecycle] Date changed detected", {
              previousDate: previousDate.toDateString(),
              currentDate: currentDate.toDateString(),
            });
          }

          set({
            isRefreshing: false,
            dateChanged,
            lastResumedAt: currentDate,
          });

          logWithContext("info", "[Lifecycle] Resume complete");
        } catch (error) {
          logWithContext("error", "[Lifecycle] Resume failed", { error });
          set({
            isRefreshing: false,
            error: error as Error,
          });
        }
      },

      onPause: async () => {
        logWithContext("info", "[Lifecycle] App paused");
      },

      clearDateChanged: () => {
        set({ dateChanged: false });
      },

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        logWithContext("info", "[Lifecycle] Resetting store to initial state");

        // ✅ Promiseキャッシュをリセット
        initPromise = null;

        set({
          isInitialized: false,
          isRefreshing: false,
          dateChanged: false,
          lastResumedAt: null,
          error: null,
        });
      },
    }),
    {
      name: "lifecycle-storage",
      // ✅ 何も永続化しない(全てメモリ管理)
      partialize: () => ({}),
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
