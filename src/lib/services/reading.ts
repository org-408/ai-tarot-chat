import { RemainingReadings } from "@/../shared/lib/types";
import { databaseRepository } from "../repositories/database";
import { apiClient } from "../utils/apiClient";
import { authService } from "./auth";

export interface Reading {
  id: string;
  deviceId: string;
  spreadId: string;
  cards: string[];
  result: {
    interpretation: string;
    advice: string;
  };
  createdAt: number;
  updatedAt: number;
  synced: boolean;
}

/**
 * 占い結果の管理
 */
export class ReadingService {
  /**
   * 占い結果を保存
   */
  async saveReading(
    spreadId: string,
    cards: string[],
    result: Reading["result"]
  ): Promise<string> {
    const id = crypto.randomUUID();
    const deviceId = await authService.getDeviceId();
    const now = Date.now();

    await databaseRepository.execute(
      `INSERT INTO readings
       (id, device_id, spread_id, cards_json, result_json, created_at, updated_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        id,
        deviceId,
        spreadId,
        JSON.stringify(cards),
        JSON.stringify(result),
        now,
        now,
      ]
    );

    return id;
  }

  /**
   * 占い履歴を取得
   */
  async getReadings(limit = 20, offset = 0): Promise<Reading[]> {
    const rows = await databaseRepository.select<{
      id: string;
      device_id: string;
      spread_id: string;
      cards_json: string;
      result_json: string;
      created_at: number;
      updated_at: number;
      synced: number;
    }>(
      `SELECT * FROM readings
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return rows.map((row) => ({
      id: row.id,
      deviceId: row.device_id,
      spreadId: row.spread_id,
      cards: JSON.parse(row.cards_json),
      result: JSON.parse(row.result_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      synced: row.synced === 1,
    }));
  }

  /**
   * 特定の占い結果を取得
   */
  async getReadingById(id: string): Promise<Reading | null> {
    const rows = await databaseRepository.select<{
      id: string;
      device_id: string;
      spread_id: string;
      cards_json: string;
      result_json: string;
      created_at: number;
      updated_at: number;
      synced: number;
    }>("SELECT * FROM readings WHERE id = ?", [id]);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      deviceId: row.device_id,
      spreadId: row.spread_id,
      cards: JSON.parse(row.cards_json),
      result: JSON.parse(row.result_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      synced: row.synced === 1,
    };
  }

  /**
   * 未同期の占い結果を取得
   */
  async getUnsyncedReadings(): Promise<Reading[]> {
    const rows = await databaseRepository.select<{
      id: string;
      device_id: string;
      spread_id: string;
      cards_json: string;
      result_json: string;
      created_at: number;
      updated_at: number;
      synced: number;
    }>("SELECT * FROM readings WHERE synced = 0");

    return rows.map((row) => ({
      id: row.id,
      deviceId: row.device_id,
      spreadId: row.spread_id,
      cards: JSON.parse(row.cards_json),
      result: JSON.parse(row.result_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      synced: false,
    }));
  }

  /**
   * 同期済みにマーク
   */
  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const placeholders = ids.map(() => "?").join(",");
    await databaseRepository.execute(
      `UPDATE readings SET synced = 1 WHERE id IN (${placeholders})`,
      ids
    );
  }

  /**
   * 占い結果を削除
   */
  async deleteReading(id: string): Promise<void> {
    await databaseRepository.execute("DELETE FROM readings WHERE id = ?", [id]);
  }

  /**
   * 今日の占い回数を取得
   */
  async getTodayCount(): Promise<number> {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const deviceId = await authService.getDeviceId();

    const rows = await databaseRepository.select<{ count: number }>(
      `SELECT COUNT(*) as count FROM readings
       WHERE device_id = ?
       AND date(created_at / 1000, 'unixepoch') = ?`,
      [deviceId, today]
    );

    return rows[0]?.count ?? 0;
  }

  /**
   * 利用可能な残りの占い回数を取得
   */
  async getRemainingReadings(): Promise<RemainingReadings> {
    const data = await apiClient.get<RemainingReadings>(
      "/api/readings/remaining"
    );
    console.log("Remaining readings fetched:", data);
    if (!data || "error" in data) {
      throw new Error("Failed to fetch remaining readings");
    }
    return data;
  }

  /**
   * プランを変更する
   */
  async changePlan(newPlanCode: string): Promise<boolean> {
    const success = await apiClient.post<{ success: boolean }>(
      "/api/plans/change",
      { code: newPlanCode }
    );
    console.log("Plan change response:", success);
    if (!success || "error" in success) {
      throw new Error("Failed to change plan");
    }
    return success.success;
  }
}

// シングルトンインスタンス
export const readingService = new ReadingService();
