import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  MasterData,
  MasterDataUpdateResponse,
  Plan,
} from "../../../../shared/lib/types";
import { storeRepository } from "../../lib/repositories/store";
import { logWithContext } from "../logger/logger";
import { masterService } from "../services/master";

interface MasterState {
  // 状態
  isReady: boolean;
  masterData: MasterData | null;
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
      masterData: null,
      isLoading: false,
      error: null,

      init: async () => {
        try {
          logWithContext("info", "[MasterStore] Initialization started");
          set({ isLoading: true, error: null });

          // 初回は必ずサーバーから取得
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
          const err = error instanceof Error ? error : new Error(String(error));
          set({ isLoading: false, error: err, isReady: true });
          logWithContext("error", "[MasterStore] Initialization failed", {
            error,
          });
          throw err;
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
            masterData: null,
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
          masterData: null,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: "master-storage",
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
