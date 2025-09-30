// tauri/src/lib/services/sync.ts（シンプル化）
import { storeRepository } from "../repositories/store";
import { apiClient } from "../utils/apiClient";
import { authService } from "./auth";
import { readingService } from "./reading";

export interface MasterData {
  plans: any[];
  levels: any[];
  categories: any[];
  spreads?: any[];
  tarotists?: any[];
}

export class SyncService {
  private readonly KEYS = {
    LAST_SYNC_CURSOR: "lastSyncCursor",
    LAST_SYNC_AT: "lastSyncAt",
    MASTER_DATA: "masterData",
    MASTER_DATA_UPDATED_AT: "masterDataUpdatedAt",
  } as const;

  async sync(): Promise<{
    pushed: number;
    pulled: number;
    masterUpdated: boolean;
  }> {
    const accessToken = await authService.getAccessToken();
    if (!accessToken) {
      throw new Error("Not authenticated");
    }

    const pushed = await this.push();
    const pulled = await this.pull();
    const masterUpdated = await this.syncMasterData();

    await storeRepository.set(this.KEYS.LAST_SYNC_AT, Date.now());

    return { pushed, pulled, masterUpdated };
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

  private async push(): Promise<number> {
    const unsynced = await readingService.getUnsyncedReadings();
    if (unsynced.length === 0) return 0;

    await apiClient.post("/api/sync/push", { readings: unsynced });

    await readingService.markSynced(unsynced.map((r) => r.id));
    return unsynced.length;
  }

  private async pull(): Promise<number> {
    const cursor =
      (await storeRepository.get<string>(this.KEYS.LAST_SYNC_CURSOR)) ?? "0";

    const data = await apiClient.get<{ readings: any[]; cursor: string }>(
      `/api/sync/pull?since=${cursor}`
    );

    for (const reading of data.readings) {
      await readingService.saveReading(
        reading.spreadId,
        reading.cards,
        reading.result
      );
    }

    await storeRepository.set(this.KEYS.LAST_SYNC_CURSOR, data.cursor);
    return data.readings.length;
  }

  async getLastSyncAt(): Promise<number | null> {
    return await storeRepository.get<number>(this.KEYS.LAST_SYNC_AT);
  }
}

export const syncService = new SyncService();
