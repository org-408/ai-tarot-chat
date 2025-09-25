import type { FavoriteSpread } from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class FavoriteRepository extends BaseRepository {
  async createFavoriteSpread(
    favorite: Omit<FavoriteSpread, "id" | "createdAt">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO favorite_spreads (id, user_id, spread_id, created_at) VALUES (?, ?, ?, ?)`,
      [id, favorite.userId, favorite.spreadId, now]
    );

    return id;
  }

  async getFavoritesByUserId(userId: string): Promise<FavoriteSpread[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM favorite_spreads WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    return rows.map((row) => this.mapRowToFavoriteSpread(row));
  }

  async isFavorite(userId: string, spreadId: string): Promise<boolean> {
    const rows = await this.db.select<any[]>(
      `SELECT id FROM favorite_spreads WHERE user_id = ? AND spread_id = ?`,
      [userId, spreadId]
    );

    return rows.length > 0;
  }

  async deleteFavorite(userId: string, spreadId: string): Promise<void> {
    await this.db.execute(
      `DELETE FROM favorite_spreads WHERE user_id = ? AND spread_id = ?`,
      [userId, spreadId]
    );
  }

  async deleteFavoritesByUserId(userId: string): Promise<void> {
    await this.db.execute(`DELETE FROM favorite_spreads WHERE user_id = ?`, [
      userId,
    ]);
  }

  private mapRowToFavoriteSpread(row: any): FavoriteSpread {
    return {
      id: row.id,
      userId: row.user_id,
      spreadId: row.spread_id,
      createdAt: this.fromTimestamp(row.created_at),
    };
  }
}

export const favoriteRepository = new FavoriteRepository();
