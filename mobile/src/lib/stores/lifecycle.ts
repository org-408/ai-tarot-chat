import { App as CapacitorApp } from "@capacitor/app";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Plan } from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";
import { HttpError, isNetworkError } from "../utils/apiClient";
import { useAuthStore } from "./auth";

// ✅ 初期化ステップの定義（デバッグ用）
type InitStep =
  | "idle"
  | "auth"
  | "subscription"
  | "client"
  | "master"
  | "complete";

type ResumeStep =
  | "idle"
  | "auth"
  | "subscription"
  | "client"
  | "master"
  | "complete";

interface LifecycleState {
  // 状態
  isInitialized: boolean;
  isRefreshing: boolean;
  dateChanged: boolean;
  lastResumedAt: Date | null;
  error: Error | null;

  // ✅ デバッグ用の状態追加
  currentInitStep: InitStep;
  currentResumeStep: ResumeStep;
  lastError: {
    step: InitStep | ResumeStep;
    error: Error;
    timestamp: Date;
  } | null;

  // ✅ オフライン状態管理
  isOffline: boolean;
  offlineMode: "none" | "limited" | "full"; // none=オンライン, limited=制限付き, full=完全オフライン

  // ✅ プラン変更状態
  isChangingPlan: boolean;
  planChangeError: string | null;

  // ログイン・アウト状態
  isLoggingIn: boolean;
  isLoggingOut: boolean;

  // アクション
  init: () => Promise<void>;
  setup: () => void;
  cleanup: () => void;
  onResume: () => Promise<void>;
  onPause: () => Promise<void>;
  clearDateChanged: () => void;
  clearError: () => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getCurrentPlan: () => Plan | null;
  changePlan: (newPlan: Plan) => Promise<void>;
  reset: () => void;

  // ✅ デバッグ用ヘルパー
  getInitStepLabel: () => string;
  getResumeStepLabel: () => string;
  getOfflineModeLabel: () => string;
}

import type { PluginListenerHandle } from "@capacitor/core";
import { getEntitlementIdentifier } from "../utils/plan-utils";
import { useClientStore } from "./client";
import { useMasterStore } from "./master";
import { useSubscriptionStore } from "./subscription";

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
      currentInitStep: "idle",
      currentResumeStep: "idle",
      lastError: null,
      isOffline: false,
      offlineMode: "none",
      isChangingPlan: false,
      isLoggingIn: false,
      isLoggingOut: false,
      planChangeError: null,

      /**
       * アプリ起動時の初期化
       *
       * ✅ Promiseキャッシュで競合状態を完全に防止
       * - 最初の呼び出しでPromiseを作成
       * - 2回目以降は即座に同じPromiseを返す(チェックと返却がアトミック)
       *
       * ✅ オフライン対応
       * - 初回起動時: オフラインなら制限モードで起動
       * - 2回目以降: ローカルキャッシュで動作
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

        // 他の処理が実行中のときはスキップ
        if (get().isChangingPlan || get().isLoggingIn || get().isLoggingOut) {
          logWithContext(
            "info",
            "[Lifecycle] Busy with another operation, skipping"
          );
          return;
        }

        logWithContext("info", "[Lifecycle] Initializing...");

        // ✅ Promiseを作成して即座に代入(これがロック)
        initPromise = (async () => {
          try {
            set({
              isRefreshing: true,
              error: null,
              currentInitStep: "idle",
              lastError: null,
              isOffline: false,
              offlineMode: "none",
            });

            // ========================================
            // ✅ ステップ1: 認証初期化
            // ========================================
            set({ currentInitStep: "auth" });
            logWithContext("info", "[Lifecycle] Step 1/4: Initializing auth");

            try {
              await useAuthStore.getState().init();
            } catch (error) {
              // ✅ ネットワークエラーかどうかチェック
              if (isNetworkError(error)) {
                logWithContext(
                  "warn",
                  "[Lifecycle] Network error during auth init - checking for cached data"
                );

                // ✅ ローカルにトークンがあるかチェック
                const token = await useAuthStore.getState().getStoredToken();

                if (token) {
                  // ✅ キャッシュあり → 制限付きモードで継続
                  logWithContext(
                    "info",
                    "[Lifecycle] Found cached token, continuing in limited mode"
                  );
                  set({
                    isOffline: true,
                    offlineMode: "limited",
                  });
                } else {
                  // ✅ 完全初回起動 → オフラインモード
                  logWithContext(
                    "warn",
                    "[Lifecycle] First launch offline - entering full offline mode"
                  );
                  set({
                    isOffline: true,
                    offlineMode: "full",
                    lastError: {
                      step: "auth",
                      error: new Error(
                        "初回起動時はインターネット接続が必要です"
                      ),
                      timestamp: new Date(),
                    },
                  });

                  // ✅ 完全オフラインでも初期化完了にする（制限付きで使えるように）
                  set({
                    isInitialized: true,
                    isRefreshing: false,
                    currentInitStep: "complete",
                  });

                  return; // 初期化終了
                }
              } else {
                // ✅ ネットワーク以外のエラー → 致命的
                logWithContext(
                  "error",
                  "[Lifecycle] Auth initialization failed",
                  { error }
                );
                set({
                  lastError: {
                    step: "auth",
                    error: error as Error,
                    timestamp: new Date(),
                  },
                });
                throw error;
              }
            }

            // ========================================
            // ✅ ステップ2: サブスクリプション初期化
            // ========================================
            set({ currentInitStep: "subscription" });
            logWithContext(
              "info",
              "[Lifecycle] Step 2/4: Initializing subscription"
            );

            try {
              await useSubscriptionStore.getState().init();
            } catch (error) {
              // サブスクリプションは非致命的
              if (isNetworkError(error)) {
                logWithContext(
                  "warn",
                  "[Lifecycle] Subscription init offline (non-critical)"
                );
                set({ isOffline: true });
              } else {
                logWithContext(
                  "warn",
                  "[Lifecycle] Subscription init failed (non-critical)",
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                  }
                );
              }
              set({
                lastError: {
                  step: "subscription",
                  error: error as Error,
                  timestamp: new Date(),
                },
              });
            }

            // ========================================
            // ✅ ステップ3: クライアント初期化
            // ========================================
            set({ currentInitStep: "client" });
            logWithContext("info", "[Lifecycle] Step 3/4: Initializing client");

            try {
              await useClientStore.getState().init();
            } catch (error) {
              if (isNetworkError(error)) {
                logWithContext(
                  "warn",
                  "[Lifecycle] Client init offline - using cached data if available"
                );
                set({
                  isOffline: true,
                  offlineMode:
                    get().offlineMode === "full" ? "full" : "limited",
                });

                // ✅ オフラインでも先に進む
                const clientStore = useClientStore.getState();
                if (clientStore.usage) {
                  logWithContext("info", "[Lifecycle] Using cached usage data");
                }
              } else {
                logWithContext(
                  "error",
                  "[Lifecycle] Client initialization failed",
                  { error }
                );
                set({
                  lastError: {
                    step: "client",
                    error: error as Error,
                    timestamp: new Date(),
                  },
                });
                throw error;
              }
            }

            // ========================================
            // ✅ ステップ4: マスターデータ初期化
            // ========================================
            set({ currentInitStep: "master" });
            logWithContext(
              "info",
              "[Lifecycle] Step 4/4: Initializing master data"
            );

            try {
              await useMasterStore.getState().init();
            } catch (error) {
              // マスターデータも非致命的
              if (isNetworkError(error)) {
                logWithContext(
                  "warn",
                  "[Lifecycle] Master init offline - using cached data if available"
                );
                set({ isOffline: true });

                // ✅ ローカルキャッシュがあれば継続
                const masterStore = useMasterStore.getState();
                if (masterStore.masterData) {
                  logWithContext(
                    "info",
                    "[Lifecycle] Using cached master data"
                  );
                } else {
                  logWithContext(
                    "warn",
                    "[Lifecycle] No cached master data available"
                  );
                  set({ offlineMode: "full" });
                }
              } else {
                logWithContext(
                  "warn",
                  "[Lifecycle] Master init failed (non-critical)",
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                  }
                );
              }
              set({
                lastError: {
                  step: "master",
                  error: error as Error,
                  timestamp: new Date(),
                },
              });
            }

            // ========================================
            // ステップ5. setup
            // ========================================
            get().setup();

            // ✅ 初期化完了
            set({
              isInitialized: true,
              isRefreshing: false,
              lastResumedAt: new Date(),
              currentInitStep: "complete",
            });

            const { isOffline, offlineMode } = get();
            logWithContext("info", "[Lifecycle] Initialization complete", {
              isReady: useAuthStore.getState().isReady,
              clientId: useAuthStore.getState().payload?.clientId,
              isOffline,
              offlineMode,
            });
          } catch (error) {
            logWithContext("error", "[Lifecycle] Initialization failed", {
              error,
            });

            set({
              isInitialized: true,
              isRefreshing: false,
              error: error as Error,
              currentInitStep: "idle",
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

        // 他の処理が実行中のときはスキップ
        if (get().isChangingPlan || get().isLoggingIn || get().isLoggingOut) {
          logWithContext(
            "info",
            "[Lifecycle] Busy with another operation, skipping"
          );
          return;
        }

        const previousDate = get().lastResumedAt;
        const currentDate = new Date();

        set({
          isRefreshing: true,
          dateChanged: false,
          error: null,
          currentResumeStep: "idle",
          lastError: null,
          isOffline: false, // ✅ レジューム時はオフライン状態をリセット
        });

        try {
          const authStore = useAuthStore.getState();

          // ========================================
          // 1. 認証トークンのリフレッシュ
          // ========================================
          set({ currentResumeStep: "auth" });
          logWithContext("info", "[Lifecycle] Step 1/4: Refreshing auth token");

          try {
            await authStore.refresh();
          } catch (refreshError) {
            if (isNetworkError(refreshError)) {
              logWithContext(
                "warn",
                "[Lifecycle] Network error during refresh - continuing with cached token"
              );
              set({ isOffline: true, offlineMode: "limited" });
            } else if (refreshError instanceof HttpError) {
              const status = refreshError.status;

              if (status === 401 || status === 500) {
                logWithContext(
                  "warn",
                  `[Lifecycle] Server returned ${status}, re-registering device`,
                  { status }
                );

                await useAuthStore.getState().registerDevice();

                logWithContext(
                  "info",
                  "[Lifecycle] Device re-registered successfully"
                );
              } else {
                logWithContext(
                  "warn",
                  "[Lifecycle] Failed to refresh token, but continuing",
                  { error: refreshError.message }
                );
              }
            } else {
              logWithContext(
                "warn",
                "[Lifecycle] Unknown error during refresh",
                { error: refreshError }
              );
            }
          }

          // ========================================
          // 2. RevenueCat の状態確認と同期
          // ========================================
          if (authStore.isAuthenticated && !get().isOffline) {
            set({ currentResumeStep: "subscription" });
            logWithContext(
              "info",
              "[Lifecycle] Step 2/4: Checking RevenueCat status"
            );
            try {
              // RevenueCatとCustomerInfo を同期
              await useSubscriptionStore.getState().refreshCustomerInfo();
            } catch (rcError) {
              if (isNetworkError(rcError)) {
                logWithContext(
                  "warn",
                  "[Lifecycle] RevenueCat offline (non-critical)"
                );
                set({ isOffline: true });
              } else {
                logWithContext(
                  "warn",
                  "[Lifecycle] Failed to sync RevenueCat, but continuing",
                  {
                    error:
                      rcError instanceof Error
                        ? rcError.message
                        : String(rcError),
                  }
                );
              }
              set({
                lastError: {
                  step: "subscription",
                  error: rcError as Error,
                  timestamp: new Date(),
                },
              });
            }
          }

          // ========================================
          // 3. 利用状況のリフレッシュ
          // ========================================
          const clientStore = useClientStore.getState();
          if (
            authStore.isAuthenticated &&
            clientStore.isReady &&
            !get().isOffline
          ) {
            set({ currentResumeStep: "client" });
            logWithContext(
              "info",
              "[Lifecycle] Step 3/4: Refreshing client usage"
            );
            try {
              await clientStore.refreshUsage();
            } catch (usageError) {
              if (isNetworkError(usageError)) {
                logWithContext(
                  "warn",
                  "[Lifecycle] Client refresh offline - using cached data"
                );
                set({ isOffline: true });
              } else {
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
              set({
                lastError: {
                  step: "client",
                  error: usageError as Error,
                  timestamp: new Date(),
                },
              });
            }
          } else {
            logWithContext(
              "info",
              "[Lifecycle] Skipping usage refresh, not authenticated or client not ready or offline"
            );
          }

          // ========================================
          // 4. マスターデータのバージョンチェック
          // ========================================
          if (useMasterStore.getState().isReady && !get().isOffline) {
            set({ currentResumeStep: "master" });
            logWithContext(
              "info",
              "[Lifecycle] Step 4/4: Checking master data version"
            );

            try {
              const versionCheck = await useMasterStore
                .getState()
                .checkVersion();
              if (versionCheck.needsUpdate) {
                logWithContext(
                  "info",
                  "[Lifecycle] Master data update available",
                  {
                    localVersion: versionCheck.clientVersion,
                    serverVersion: versionCheck.latestVersion,
                  }
                );
                // 必要に応じてここで更新
                await useMasterStore.getState().refresh();
              }
            } catch (error) {
              if (isNetworkError(error)) {
                logWithContext(
                  "warn",
                  "[Lifecycle] Master data check offline (non-critical)"
                );
                set({ isOffline: true });
              } else {
                logWithContext(
                  "warn",
                  "[Lifecycle] Master data check failed (non-critical)",
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                  }
                );
              }
              set({
                lastError: {
                  step: "master",
                  error: error as Error,
                  timestamp: new Date(),
                },
              });
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
            currentResumeStep: "complete",
          });

          const { isOffline, offlineMode } = get();
          logWithContext("info", "[Lifecycle] Resume complete", {
            isOffline,
            offlineMode,
          });
        } catch (error) {
          logWithContext("error", "[Lifecycle] Resume failed", { error });
          set({
            isRefreshing: false,
            error: error as Error,
            currentResumeStep: "idle",
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
        set({ error: null, lastError: null, planChangeError: null });
      },

      /**
       * ✅ ログイン処理
       *
       * ログアウト後に再度ログインする場合のルート
       * changePlan() とは別に、単純にログインだけしたい場合に使用
       */
      login: async () => {
        logWithContext("info", "[Lifecycle] Login started");

        set({ isLoggingIn: true, error: null });

        try {
          // ========================================
          // 1. Auth でログイン
          // ========================================
          logWithContext("info", "[Lifecycle] Auth login");
          const payload = await useAuthStore.getState().login();
          const userId = payload.user?.id;
          // TODO: userIdが取れない場合の処理は必要？？？エラースローで良い？

          //  =======================================
          // 2. Subscription のログイン
          // ========================================
          logWithContext("info", "[Lifecycle] Subscription login");
          const info = await useSubscriptionStore.getState().login(userId!);

          // ========================================
          // 2. onResume() を呼んで全体をリフレッシュ
          // ✅ subscription同期
          // ✅ client.refreshUsage() → ログイン後のプラン利用状況取得
          // ✅ master確認
          // ========================================
          logWithContext(
            "info",
            "[Lifecycle] Calling onResume to refresh all stores"
          );
          await get().onResume();

          logWithContext("info", "[Lifecycle] Login completed successfully", {
            payload,
            entitlements: Object.keys(info.entitlements.active),
          });
        } catch (error) {
          logWithContext("error", "[Lifecycle] Login failed", { error });
          throw error;
        } finally {
          set({ isLoggingIn: false });
        }
      },

      /**
       * ✅ ログアウト処理
       *
       * 既存のフローを再利用するシンプルな設計:
       * 1. auth.logout() でGUESTトークンをセット
       * 2. onResume() を呼んで全体をリフレッシュ
       */
      logout: async () => {
        logWithContext("info", "[Lifecycle] Logout started");
        set({ isLoggingOut: true, error: null });

        try {
          // ========================================
          // 1. Auth からログアウト
          // ✅ authService.logout() がサーバーから新しいGUESTトークンを取得
          // ✅ auth store に新しいGUESTのpayloadがセットされる
          // ========================================
          logWithContext("info", "[Lifecycle] Auth logout");
          const payload = await useAuthStore.getState().logout();

          // ========================================
          // 2. Subscription のログアウト
          // ========================================
          logWithContext("info", "[Lifecycle] Subscription logout");
          const info = await useSubscriptionStore.getState().logout();

          // 3. onResume() を呼んで既存のリフレッシュフローを再利用
          // ✅ auth.refresh() → GUESTトークンの検証
          // ✅ subscription同期 → リセットされる
          // ✅ client.refreshUsage() → GUEST利用状況取得
          // ✅ master確認 → そのまま使用
          // ========================================
          logWithContext(
            "info",
            "[Lifecycle] Calling onResume to refresh all stores"
          );
          await get().onResume();

          logWithContext("info", "[Lifecycle] Logout completed successfully", {
            payload,
            entitlements: Object.keys(info.entitlements.active),
          });
        } catch (error) {
          logWithContext("error", "[Lifecycle] Logout failed", { error });
          throw error;
        } finally {
          set({ isLoggingOut: false });
        }
      },

      /**
       * ✅ ヘルパー: 現在のプランを取得
       */
      getCurrentPlan: () => {
        // client が都度取得しているはず
        // 基本的に随時 RevenueCat と同期しているはずなので、
        // 気にせず clientStore を参照すれば良いはず
        return useClientStore.getState().currentPlan;
      },

      /**
       * ✅ プラン変更処理
       *
       * 複数ストアを跨ぐプラン変更フローを統括:
       * 1. 認証が必要ならログイン
       * 2. 有料プランなら購入処理
       * 3. 無料プランならAPIで変更
       * 4. 利用状況を更新
       */
      changePlan: async (newPlan: Plan) => {
        const { isChangingPlan } = get();
        const authStore = useAuthStore.getState();
        const currentPlan = get().getCurrentPlan();
        const currentPlanCode = currentPlan ? currentPlan.code : "GUEST";

        logWithContext("info", "[Lifecycle] changePlan called", {
          newPlan: newPlan.code,
          currentPlanCode,
        });

        if (isChangingPlan) {
          logWithContext("warn", "[Lifecycle] Plan change already in progress");
          return;
        }
        set({ isChangingPlan: true, planChangeError: null });

        if (currentPlanCode === newPlan.code) {
          logWithContext("info", "[Lifecycle] Already on target plan");
          return;
        }

        if (newPlan.code === "GUEST") {
          logWithContext("warn", "[Lifecycle] Cannot change to GUEST plan");
          set({ planChangeError: "GUESTプランへの変更はできません" });
          return;
        }

        logWithContext("info", "[Lifecycle] Starting plan change", {
          from: currentPlanCode,
          to: newPlan.code,
        });

        try {
          const subscriptionStore = useSubscriptionStore.getState();

          // ============================================
          // 1. 認証が必要な場合はログイン
          // ============================================
          let payload = authStore.payload;
          let info = subscriptionStore.customerInfo;
          if (!authStore.isAuthenticated) {
            logWithContext("info", "[Lifecycle] Authentication required");
            payload = await authStore.login();
            logWithContext("info", "[Lifecycle] OAuth Logged in", { payload });
          }

          if (!payload) {
            logWithContext(
              "error",
              "[Lifecycle] Auth payload missing after login"
            );
            throw new Error("Authentication failed, payload is null");
          }

          if (!subscriptionStore.isLoggedIn) {
            const userId = payload.user?.id;
            if (!userId) {
              logWithContext(
                "error",
                "[Lifecycle] User ID missing after login",
                {
                  authPayload: payload,
                }
              );
              throw new Error("User ID is missing after login");
            }
            info = await subscriptionStore.login(userId);
            if (!info) {
              logWithContext(
                "error",
                "[Lifecycle] Subscription info missing after login"
              );
              throw new Error("Subscription login failed, info is null");
            }
            logWithContext("info", "[Lifecycle] Logging into subscription", {
              userId,
              entitlements: Object.keys(info.entitlements.active),
            });
          }

          // ============================================
          // 2. 有料プランで購読がない場合のみ購入
          // ============================================
          if (newPlan.price > 0) {
            const targetEntitlement = getEntitlementIdentifier(newPlan.code);
            const customerInfo = info || subscriptionStore.customerInfo;
            if (!customerInfo) {
              logWithContext(
                "error",
                "[Lifecycle] CustomerInfo missing for purchase"
              );
              throw new Error(
                "CustomerInfo is null, cannot proceed with purchase"
              );
            }
            const hasEntitlement =
              customerInfo.entitlements.active[targetEntitlement];

            if (!hasEntitlement) {
              logWithContext("info", "[Lifecycle] No subscription, purchasing");
              await subscriptionStore.purchasePlan(newPlan);
            }
          }

          // ============================================
          // 3. サーバーAPIでプラン変更
          // ============================================
          logWithContext("info", "[Lifecycle] Updating plan on server");
          await useClientStore.getState().changePlan(newPlan);

          set({ isChangingPlan: false, planChangeError: null });

          logWithContext("info", "[Lifecycle] Plan change completed", {
            newPlan: newPlan.code,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          logWithContext("error", "[Lifecycle] Plan change failed", {
            error: errorMessage,
          });

          set({
            isChangingPlan: false,
            planChangeError: `プラン変更に失敗しました: ${errorMessage}`,
          });

          throw error;
        }
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
          currentInitStep: "idle",
          currentResumeStep: "idle",
          lastError: null,
          isOffline: false,
          offlineMode: "none",
          isChangingPlan: false,
          planChangeError: null,
        });
      },

      // ✅ デバッグ用ヘルパー
      getInitStepLabel: () => {
        const step = get().currentInitStep;
        const labels = {
          idle: "待機中",
          auth: "認証初期化中 (1/4)",
          subscription: "サブスク初期化中 (2/4)",
          client: "クライアント初期化中 (3/4)",
          master: "マスターデータ初期化中 (4/4)",
          complete: "初期化完了",
        };
        return labels[step];
      },

      getResumeStepLabel: () => {
        const step = get().currentResumeStep;
        const labels = {
          idle: "待機中",
          auth: "認証更新中 (1/4)",
          subscription: "サブスク同期中 (2/4)",
          client: "利用状況更新中 (3/4)",
          master: "マスターデータ確認中 (4/4)",
          complete: "更新完了",
        };
        return labels[step];
      },

      getOfflineModeLabel: () => {
        const mode = get().offlineMode;
        const labels = {
          none: "オンライン",
          limited: "制限モード (キャッシュ使用)",
          full: "オフライン (初回起動不可)",
        };
        return labels[mode];
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
