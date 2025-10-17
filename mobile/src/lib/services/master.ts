import type {
  MasterData,
  MasterDataUpdateResponse,
} from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { apiClient } from "../utils/apiClient";

export class MasterService {
  /**
   * サーバーに更新チェック（POST）
   */
  async checkUpdate(localVersion: string): Promise<MasterDataUpdateResponse> {
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
  async getMasterData(): Promise<MasterData> {
    logWithContext("info", "[MasterService] Fetching master data from server");
    console.trace("[MasterService] getMasterData called");

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
}

export const masterService = new MasterService();
