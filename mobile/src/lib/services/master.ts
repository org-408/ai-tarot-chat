import type {
  MasterData,
  MasterDataUpdateResponse,
} from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { filesystemRepository } from "../repositories/filesystem";
import { storeRepository } from "../repositories/store";
import { apiClient } from "../utils/apiClient";

const MASTER_DATA_KEY = "master_data";
const MASTER_VERSION_KEY = "master_data_version";

export class MasterService {
  /**
   * ローカルのマスターデータを読み込み
   */
  private async loadLocalData(): Promise<MasterData | null> {
    return await filesystemRepository.get<MasterData>(MASTER_DATA_KEY);
  }

  /**
   * マスターデータをローカルに保存
   */
  private async saveLocalData(data: MasterData): Promise<void> {
    await filesystemRepository.set(MASTER_DATA_KEY, data);
    await storeRepository.set(MASTER_VERSION_KEY, data.version);
    logWithContext("info", "[MasterService] Master data saved locally", {
      version: data.version,
    });
  }

  /**
   * マスターデータの整合性チェック
   */
  private validateMasterData(data: MasterData | null): boolean {
    if (!data) return false;
    if (!data.version) return false;

    // decks の存在チェック
    if (!Array.isArray(data.decks) || data.decks.length === 0) {
      logWithContext(
        "warn",
        "[MasterService] Invalid master data: decks missing"
      );
      return false;
    }

    // decks の中に cards があるかチェック
    const hasCards = data.decks.some(
      (deck) => Array.isArray(deck.cards) && deck.cards.length > 0
    );
    if (!hasCards) {
      logWithContext(
        "warn",
        "[MasterService] Invalid master data: no cards in decks"
      );
      return false;
    }

    // spreads の存在チェック
    if (!Array.isArray(data.spreads) || data.spreads.length === 0) {
      logWithContext(
        "warn",
        "[MasterService] Invalid master data: spreads missing"
      );
      return false;
    }

    return true;
  }

  /**
   * サーバーに更新チェック（POST）
   */
  private async checkUpdate(
    localVersion: string
  ): Promise<MasterDataUpdateResponse> {
    try {
      const response = await apiClient.post<MasterDataUpdateResponse>(
        "/api/masters/check-update",
        {
          version: localVersion,
        }
      );

      logWithContext("info", "[MasterService] Update check result", {
        ...response,
      });

      return response;
    } catch (error) {
      logWithContext("error", "[MasterService] Update check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      // エラー時は更新なしとみなす（ローカルデータを使用）
      return {
        needsUpdate: false,
        clientVersion: "error",
        latestVersion: localVersion,
        updatedAt: new Date(0),
      };
    }
  }

  /**
   * サーバーからマスターデータを取得
   */
  private async fetchFromServer(): Promise<MasterData> {
    logWithContext("info", "[MasterService] Fetching master data from server");

    try {
      const data = await apiClient.get<MasterData>("/api/masters");

      logWithContext(
        "info",
        "[MasterService] Master data fetched successfully",
        {
          version: data.version,
          decksCount: data.decks?.length || 0,
          spreadsCount: data.spreads?.length || 0,
          categoriesCount: data.categories?.length || 0,
          levelsCount: data.levels?.length || 0,
          tarotistsCount: data.tarotists?.length || 0,
          plansCount: data.plans?.length || 0,
        }
      );

      return data;
    } catch (error) {
      logWithContext("error", "[MasterService] Failed to fetch master data", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * マスターデータを取得
   * - 初回: サーバーから取得してローカル保存
   * - 2回目以降: サーバーに更新チェックして、必要なら更新
   * - オフライン: ローカルデータで動作
   *
   * @param forceRefresh - 強制的にサーバーから再取得
   */
  async getMasterData(forceRefresh: boolean = false): Promise<MasterData> {
    try {
      // 強制更新
      if (forceRefresh) {
        logWithContext("info", "[MasterService] Force refresh requested");
        const data = await this.fetchFromServer();
        await this.saveLocalData(data);
        return data;
      }

      // ローカルデータ確認
      const localData = await this.loadLocalData();
      const isValid = this.validateMasterData(localData);

      // ローカルデータが無効（初回起動 or 破損）
      if (!isValid) {
        logWithContext(
          "info",
          "[MasterService] No valid local data, fetching from server"
        );
        const data = await this.fetchFromServer();
        await this.saveLocalData(data);
        return data;
      }

      // バージョンチェック（ネットワークがある場合のみ）
      try {
        const { needsUpdate, latestVersion } = await this.checkUpdate(
          localData!.version
        );

        if (needsUpdate) {
          logWithContext(
            "info",
            "[MasterService] New version available, updating",
            {
              localVersion: localData!.version,
              latestVersion,
            }
          );
          const data = await this.fetchFromServer();
          await this.saveLocalData(data);
          return data;
        }

        // 最新版
        logWithContext("info", "[MasterService] Using local master data", {
          version: localData!.version,
        });
        return localData!;
      } catch (error) {
        // ネットワークエラー → ローカルデータを使用
        logWithContext(
          "warn",
          "[MasterService] Network error, using local data",
          {
            version: localData!.version,
            error: error instanceof Error ? error.message : String(error),
          }
        );
        return localData!;
      }
    } catch (error) {
      logWithContext("error", "[MasterService] Failed to get master data", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * ローカルデータをクリア（デバッグ用）
   */
  async clearLocalData(): Promise<void> {
    try {
      await filesystemRepository.delete(MASTER_DATA_KEY);
      await storeRepository.delete(MASTER_VERSION_KEY);
      logWithContext("info", "[MasterService] Local master data cleared");
    } catch (error) {
      logWithContext("error", "[MasterService] Failed to clear local data", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export const masterService = new MasterService();
