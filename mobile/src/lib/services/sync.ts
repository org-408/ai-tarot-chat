import type { MasterData } from "../../types";
import { storeRepository } from "../repositories/store";
import { apiClient } from "../utils/apiClient";
import { authService } from "./auth";

export class SyncService {
  private readonly KEYS = {
    LAST_SYNC_CURSOR: "lastSyncCursor",
    LAST_SYNC_AT: "lastSyncAt",
    MASTER_DATA: "masterData",
    MASTER_DATA_UPDATED_AT: "masterDataUpdatedAt",
  } as const;

  async sync(): Promise<{
    masterUpdated: boolean;
  }> {
    const accessToken = await authService.getAccessToken();
    if (!accessToken) {
      throw new Error("Not authenticated");
    }

    const masterUpdated = await this.syncMasterData();

    await storeRepository.set(this.KEYS.LAST_SYNC_AT, Date.now());

    return { masterUpdated };
  }

  async syncMasterData(): Promise<boolean> {
    try {
      const needsUpdate = await this.checkMasterDataUpdates();

      if (needsUpdate) {
        await this.fetchAndSaveMasterData();
        return true;
      }

      return false;
    } catch (error) {
      console.warn("マスターデータ同期失敗:", error);
      return false;
    }
  }

  async getMasterData(forceRefresh = false): Promise<MasterData> {
    if (forceRefresh) {
      return await this.fetchAndSaveMasterData();
    }

    const cached = await storeRepository.get<MasterData>(this.KEYS.MASTER_DATA);

    // ✅ nullまたは空オブジェクトの場合は初回取得
    if (!cached || !cached.plans || cached.plans.length === 0) {
      console.log("キャッシュなし - 初回取得");
      return await this.fetchAndSaveMasterData();
    }

    try {
      const needsUpdate = await this.checkMasterDataUpdates();

      if (needsUpdate) {
        console.log("サーバーに新しいデータあり - 再取得");
        return await this.fetchAndSaveMasterData();
      }

      console.log("マスターデータ（キャッシュ利用）", {
        plans: cached.plans?.length,
        categories: cached.categories?.length,
        spreads: cached.spreads?.length,
      });
      return cached;
    } catch (error) {
      console.warn("更新チェック失敗 - キャッシュを使用:", error);
      // ✅ エラー時もキャッシュが有効か確認
      if (!cached.plans || cached.plans.length === 0) {
        console.log("キャッシュ無効 - 強制取得");
        return await this.fetchAndSaveMasterData();
      }
      return cached;
    }
  }
  private async checkMasterDataUpdates(): Promise<boolean> {
    const lastUpdatedAt = await storeRepository.get<string>(
      this.KEYS.MASTER_DATA_UPDATED_AT
    );

    const { needsUpdate } = await apiClient.post<{ needsUpdate: boolean }>(
      "/api/masters/check-updates",
      { lastUpdatedAt }
    );

    return needsUpdate;
  }

  private async fetchAndSaveMasterData(): Promise<MasterData> {
    console.log("マスターデータ取得中...");

    const data = await apiClient.get<MasterData>("/api/masters");

    await storeRepository.set(this.KEYS.MASTER_DATA, data);
    await storeRepository.set(
      this.KEYS.MASTER_DATA_UPDATED_AT,
      new Date().toISOString()
    );

    console.log("マスターデータ取得完了");
    return data;
  }

  async getLastSyncAt(): Promise<number | null> {
    return await storeRepository.get<number>(this.KEYS.LAST_SYNC_AT);
  }
}

export const syncService = new SyncService();
