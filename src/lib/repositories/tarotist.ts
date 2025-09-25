import type { Tarotist } from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class TarotistRepository extends BaseRepository {
  async createTarotist(
    tarotist: Omit<Tarotist, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO tarotists (
        id, name, bio, avatar_url, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        tarotist.name,
        tarotist.bio,
        tarotist.avatarUrl ?? null,
        now,
        now,
        this.nullableTimestamp(tarotist.deletedAt),
      ]
    );

    return id;
  }

  async getTarotistById(id: string): Promise<Tarotist | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM tarotists WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToTarotist(rows[0]);
  }

  async getAllTarotists(): Promise<Tarotist[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM tarotists WHERE deleted_at IS NULL ORDER BY created_at ASC`
    );

    return rows.map((row) => this.mapRowToTarotist(row));
  }

  async updateTarotist(
    id: string,
    updates: Partial<Omit<Tarotist, "id" | "createdAt" | "updatedAt">>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.bio !== undefined) {
      fields.push("bio = ?");
      values.push(updates.bio);
    }
    if (updates.avatarUrl !== undefined) {
      fields.push("avatar_url = ?");
      values.push(updates.avatarUrl);
    }

    if (fields.length === 0) return;

    fields.push("updated_at = ?");
    values.push(Date.now());
    values.push(id);

    await this.db.execute(
      `UPDATE tarotists SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  }

  async softDeleteTarotist(id: string): Promise<void> {
    await this.db.execute(
      `UPDATE tarotists SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [Date.now(), Date.now(), id]
    );
  }

  private mapRowToTarotist(row: any): Tarotist {
    return {
      id: row.id,
      name: row.name,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      createdAt: this.fromTimestamp(row.created_at),
      updatedAt: this.fromTimestamp(row.updated_at),
      deletedAt: this.nullableDate(row.deleted_at),
    };
  }
}

export const tarotistRepository = new TarotistRepository();
