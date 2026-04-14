import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  MasterData,
  MasterDataUpdateResponse,
  Plan,
} from "../../../../shared/lib/types";
import { DEFAULT_MASTER_DATA } from "../../assets/master-data";
import { logWithContext } from "../logger/logger";
import { filesystemRepository } from "../repositories/filesystem";
import { masterService } from "../services/master";

interface MasterState {
  // 状態
  isReady: boolean;
  masterData: MasterData;
  isLoading: boolean;
  error: Error | null;

  // アクション
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  checkVersion: () => Promise<MasterDataUpdateResponse>;
  getPlan: (code: string) => Plan | null;
  clear: () => Promise<void>;
  reset: () => void;
}

/**
 * マスターデータストア
 *
 * - 初回: サーバーから取得してローカルキャッシュ（filesystem）
 * - 2回目以降: サーバー側でバージョンチェック
 *   - 最新版: ローカルデータ使用
 *   - 更新あり: 全データ取得
 * - オフライン: ローカルキャッシュで動作
 *
 * ⚠️ 認証完了後（isReady: true）のみ実行
 */
export const useMasterStore = create<MasterState>()(
  persist(
    (set, get) => ({
      isReady: false,
      masterData: DEFAULT_MASTER_DATA,
      isLoading: false,
      error: null,

      init: async () => {
        logWithContext("info", "[MasterStore] Initialization started");

        const persistedData = get().masterData;
        const isFirstLaunch = !persistedData?.version;

        if (isFirstLaunch) {
          // 初回起動: サーバーから取得完了まで isReady: false のまま待つ
          // (DEFAULT_MASTER_DATA の id は環境ごとに異なるため使用不可)
          logWithContext("info", "[MasterStore] First launch, fetching from server");
          set({ isLoading: true, isReady: false });
          try {
            const data = await masterService.getMasterData();
            set({
              masterData: data,
              isReady: true,
              isLoading: false,
              error: null,
            });
            logWithContext("info", "[MasterStore] First launch fetch completed", {
              version: data.version,
              decksCount: data.decks?.length || 0,
            });
          } catch (error) {
            const normalizedError =
              error instanceof Error ? error : new Error(String(error));
            logWithContext("error", "[MasterStore] First launch fetch failed", {
              error: normalizedError.message,
            });
            // 失敗時は DEFAULT_MASTER_DATA で fallback（一部機能は制限される）
            set({
              masterData: DEFAULT_MASTER_DATA,
              isReady: true,
              isLoading: false,
              error: normalizedError,
            });
          }
          return;
        }

        // 2回目以降: キャッシュを即座に使い、バックグラウンドでバージョンチェック
        set({
          masterData: persistedData,
          isReady: true,
          isLoading: false,
          error: null,
        });

        logWithContext("info", "[MasterStore] Using cached master data", {
          version: persistedData.version,
          decksCount: persistedData.decks?.length || 0,
          spreadsCount: persistedData.spreads?.length || 0,
        });

        try {
          const versionCheck = await get().checkVersion();

          if (!versionCheck.needsUpdate) {
            logWithContext("info", "[MasterStore] Local master data is up to date");
            return;
          }

          set({ isLoading: true });
          logWithContext(
            "info",
            "[MasterStore] Update needed, fetching latest master data",
            versionCheck
          );

          const data = await masterService.getMasterData();
          set({
            masterData: data,
            isReady: true,
            isLoading: false,
            error: null,
          });

          logWithContext("info", "[MasterStore] Initialization completed", {
            version: data.version,
            decksCount: data.decks?.length || 0,
            spreadsCount: data.spreads?.length || 0,
          });
        } catch (error) {
          const normalizedError =
            error instanceof Error ? error : new Error(String(error));

          logWithContext(
            "warn",
            "[MasterStore] Failed to refresh master data, keeping cached copy",
            { error: normalizedError.message }
          );

          set({
            isReady: true,
            isLoading: false,
            error: normalizedError,
          });
        }
      },

      refresh: async () => {
        try {
          logWithContext("info", "[MasterStore] Refresh started");

          // サーバーのバージョンをチェックして、必要なら取得
          const result = await get().checkVersion();

          if (!result.needsUpdate) {
            logWithContext("info", "[MasterStore] No update needed");
            set({ isLoading: false });
            return;
          }

          logWithContext(
            "info",
            "[MasterStore] Update needed, fetching data",
            result
          );

          set({ isLoading: true });

          const data = await masterService.getMasterData();
          set({
            masterData: data,
            isLoading: false,
            error: null,
          });

          logWithContext("info", "[MasterStore] Refresh completed", {
            version: data.version,
          });
        } catch (refreshError) {
          const error =
            refreshError instanceof Error
              ? refreshError
              : new Error(String(refreshError));
          set({ isLoading: false, error });
          logWithContext("error", "[MasterStore] Refresh failed", { error });
        }
      },

      checkVersion: async () => {
        const state = get();
        const localVersion = state.masterData?.version || "0";

        try {
          logWithContext("info", "[MasterStore] Checking version", {
            localVersion,
          });

          const response = await masterService.checkUpdate(localVersion);

          logWithContext(
            "info",
            "[MasterStore] Version check completed",
            response
          );
          return response;
        } catch (error) {
          logWithContext("error", "[MasterStore] Version check failed", {
            error,
          });
          throw error;
        }
      },

      getPlan: (code: string): Plan | null => {
        const state = get();
        const plans = state.masterData?.plans || [];
        return plans.find((plan) => plan.code === code) || null;
      },

      clear: async () => {
        try {
          logWithContext("info", "[MasterStore] Clearing data");
          set({
            masterData: DEFAULT_MASTER_DATA,
            isReady: false,
            isLoading: false,
            error: null,
          });

          logWithContext("info", "[MasterStore] Clear completed");
        } catch (error) {
          logWithContext("error", "[MasterStore] Clear failed", { error });
          throw error;
        }
      },

      reset: () => {
        logWithContext("info", "[MasterStore] Resetting state");
        set({
          isReady: false,
          masterData: DEFAULT_MASTER_DATA,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: "master-storage",
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          const value = await filesystemRepository.get(name);
          return value ? JSON.stringify(value) : null;
        },
        setItem: async (name: string, value: string) => {
          const parsed = JSON.parse(value);
          await filesystemRepository.set(name, parsed);
        },
        removeItem: async (name: string) => {
          await filesystemRepository.delete(name);
        },
      })),
    }
  )
);
