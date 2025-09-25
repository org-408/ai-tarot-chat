import { storeRepository } from "../repositories/store";
import { authService } from "./auth";
import { readingService } from "./reading";

/**
 * サーバーとの同期管理
 */
export class SyncService {
  private readonly KEYS = {
    LAST_SYNC_CURSOR: "lastSyncCursor",
    LAST_SYNC_AT: "lastSyncAt",
  } as const;

  /**
   * 同期実行
   */
  async sync(): Promise<{ pushed: number; pulled: number }> {
    const accessToken = await authService.getAccessToken();
    if (!accessToken) {
      throw new Error("Not authenticated");
    }

    // 1) Push: 未同期データをアップロード
    const pushed = await this.push(accessToken);

    // 2) Pull: サーバーから差分取得
    const pulled = await this.pull(accessToken);

    // 最終同期時刻更新
    await storeRepository.set(this.KEYS.LAST_SYNC_AT, Date.now());

    return { pushed, pulled };
  }

  private async push(accessToken: string): Promise<number> {
    const unsynced = await readingService.getUnsyncedReadings();
    if (unsynced.length === 0) return 0;

    // API呼び出し（実装例）
    const response = await fetch("/api/sync/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ readings: unsynced }),
    });

    if (!response.ok) {
      throw new Error("Push failed");
    }

    // 同期済みマーク
    await readingService.markSynced(unsynced.map((r) => r.id));

    return unsynced.length;
  }

  private async pull(accessToken: string): Promise<number> {
    const cursor =
      (await storeRepository.get<string>(this.KEYS.LAST_SYNC_CURSOR)) ?? "0";

    // API呼び出し
    const response = await fetch(`/api/sync/pull?since=${cursor}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Pull failed");
    }

    const data = await response.json();

    // ローカルに保存
    for (const reading of data.readings) {
      await readingService.saveReading(
        reading.spreadId,
        reading.cards,
        reading.result
      );
    }

    // カーソル更新
    await storeRepository.set(this.KEYS.LAST_SYNC_CURSOR, data.cursor);

    return data.readings.length;
  }

  /**
   * 最終同期時刻を取得
   */
  async getLastSyncAt(): Promise<number | null> {
    return await storeRepository.get<number>(this.KEYS.LAST_SYNC_AT);
  }
}

// シングルトンインスタンス
export const syncService = new SyncService();
