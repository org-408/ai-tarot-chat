import type { DrawnCard, Reading } from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class ReadingRepository extends BaseRepository {
  // ==================== Reading ====================
  async createReading(
    reading: Omit<Reading, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO readings (
        id, user_id, device_id, tarotist_id, spread_id, category_id, cards, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        reading.clientId ?? null,
        reading.deviceId,
        reading.tarotistId,
        reading.spreadId,
        reading.categoryId,
        this.stringifyJSON(reading.cards),
        now,
        now,
      ]
    );

    return id;
  }

  async getReadingById(id: string): Promise<Reading | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM readings WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToReading(rows[0]);
  }

  async getReadingsByUserId(
    clientId: string,
    limit = 20,
    offset = 0
  ): Promise<Reading[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM readings WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [clientId, limit, offset]
    );

    return rows.map((row) => this.mapRowToReading(row));
  }

  async getReadingsByDeviceId(
    deviceId: string,
    limit = 20,
    offset = 0
  ): Promise<Reading[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM readings WHERE device_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [deviceId, limit, offset]
    );

    return rows.map((row) => this.mapRowToReading(row));
  }

  async getReadingsBySpreadId(spreadId: string): Promise<Reading[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM readings WHERE spread_id = ? ORDER BY created_at DESC`,
      [spreadId]
    );

    return rows.map((row) => this.mapRowToReading(row));
  }

  async getReadingsByCategoryId(categoryId: string): Promise<Reading[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM readings WHERE category_id = ? ORDER BY created_at DESC`,
      [categoryId]
    );

    return rows.map((row) => this.mapRowToReading(row));
  }

  async deleteReading(id: string): Promise<void> {
    await this.db.execute(`DELETE FROM readings WHERE id = ?`, [id]);
  }

  private mapRowToReading(row: any): Reading {
    return {
      id: row.id,
      clientId: row.user_id,
      deviceId: row.device_id,
      tarotistId: row.tarotist_id,
      spreadId: row.spread_id,
      categoryId: row.category_id,
      cards: this.parseJSON<DrawnCard[]>(row.cards),
      createdAt: this.fromTimestamp(row.created_at),
      updatedAt: this.fromTimestamp(row.updated_at),
    };
  }

  // ==================== DrawnCard ====================
  async createDrawnCard(
    DrawnCard: Omit<DrawnCard, "id" | "createdAt">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO draw_cards (
        id, reading_id, card_id, position_x, position_y, is_reversed, "order", created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        DrawnCard.readingId,
        DrawnCard.cardId,
        DrawnCard.x,
        DrawnCard.y,
        this.boolToInt(DrawnCard.isReversed),
        DrawnCard.order,
        now,
      ]
    );

    return id;
  }

  async getDrawnCardsByReadingId(readingId: string): Promise<DrawnCard[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM draw_cards WHERE reading_id = ? ORDER BY "order" ASC`,
      [readingId]
    );

    return rows.map((row) => this.mapRowToDrawnCard(row));
  }

  async deleteDrawnCardsByReadingId(readingId: string): Promise<void> {
    await this.db.execute(`DELETE FROM draw_cards WHERE reading_id = ?`, [
      readingId,
    ]);
  }

  private mapRowToDrawnCard(row: any): DrawnCard {
    return {
      id: row.id,
      readingId: row.reading_id,
      cardId: row.card_id,
      x: row.position_x,
      y: row.position_y,
      isReversed: this.intToBool(row.is_reversed),
      order: row.order,
      createdAt: this.fromTimestamp(row.created_at),
    };
  }
}

export const readingRepository = new ReadingRepository();
