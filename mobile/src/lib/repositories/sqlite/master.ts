/**
 * Master Config Repository (SQLite版)
 *
 * Prisma版のMasterConfigRepositoryをSQLite用に移植
 */

import { v4 as uuidv4 } from "uuid";
import type { MasterConfig } from "../../../../../shared/lib/types";
import type { MasterConfigRow } from "../../database/types";
import { BaseRepository } from "./base";

export class MasterConfigRepository extends BaseRepository {
  async createMasterConfig(
    data: Omit<MasterConfig, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const db = await this.getDb();
    const id = uuidv4();
    const now = this.dateToString(new Date());

    await db.run(
      `INSERT INTO master_config (id, key, version, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.key || "MASTER_VERSION",
        data.version,
        data.description || null,
        now,
        now,
      ]
    );

    return id;
  }

  async getLatestMasterConfig(): Promise<MasterConfig | null> {
    const db = await this.getDb();
    const result = await db.query(
      "SELECT * FROM master_config ORDER BY createdAt DESC LIMIT 1"
    );

    if (!result.values || result.values.length === 0) return null;

    return this.mapRowToMasterConfig(result.values[0]);
  }

  async getMasterConfigByKey(key: string): Promise<MasterConfig | null> {
    const db = await this.getDb();
    const result = await db.query(
      "SELECT * FROM master_config WHERE key = ? ORDER BY createdAt DESC LIMIT 1",
      [key]
    );

    if (!result.values || result.values.length === 0) return null;

    return this.mapRowToMasterConfig(result.values[0]);
  }

  async listAllMasterConfigs(): Promise<MasterConfig[]> {
    const db = await this.getDb();
    const result = await db.query(
      "SELECT * FROM master_config ORDER BY createdAt DESC"
    );

    if (!result.values) return [];

    return result.values.map((row) => this.mapRowToMasterConfig(row));
  }

  async deleteMasterConfig(id: string): Promise<void> {
    const db = await this.getDb();
    await db.run("DELETE FROM master_config WHERE id = ?", [id]);
  }

  // ==================== Helper ====================

  private mapRowToMasterConfig(row: MasterConfigRow): MasterConfig {
    return {
      id: row.id,
      key: row.key,
      version: row.version,
      description: row.description,
      createdAt: this.stringToDate(row.createdAt),
      updatedAt: this.stringToDate(row.updatedAt),
    };
  }
}

export const masterConfigRepository = new MasterConfigRepository();
