/**
 * Tarotist Repository (SQLite版)
 * 
 * Prisma版のTarotistRepositoryをSQLite用に移植
 */

import type { Tarotist } from "@/../shared/lib/types";
import { BaseRepository } from "./base";
import { v4 as uuidv4 } from 'uuid';

export class TarotistRepository extends BaseRepository {
  async createTarotist(
    tarotist: Omit<
      Tarotist,
      "id" | "createdAt" | "updatedAt" | "readings" | "chatMessages" | "plan"
    >
  ): Promise<string> {
    const db = await this.getDb();
    const id = uuidv4();
    const now = this.dateToString(new Date());

    await db.run(
      `INSERT INTO tarotists 
      (id, name, title, icon, trait, bio, provider, quality, "order", planId,
       primaryColor, secondaryColor, accentColor, avatarUrl, cost, deletedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        tarotist.name,
        tarotist.title,
        tarotist.icon,
        tarotist.trait,
        tarotist.bio,
        tarotist.provider,
        tarotist.quality,
        tarotist.order,
        tarotist.planId,
        tarotist.primaryColor,
        tarotist.secondaryColor,
        tarotist.accentColor,
        tarotist.avatarUrl || null,
        tarotist.cost,
        tarotist.deletedAt ? this.dateToString(tarotist.deletedAt) : null,
        now,
        now,
      ]
    );

    return id;
  }

  async getTarotistById(id: string): Promise<Tarotist | null> {
    const db = await this.getDb();
    const result = await db.query(
      'SELECT * FROM tarotists WHERE id = ? AND deletedAt IS NULL',
      [id]
    );
    
    if (!result.values || result.values.length === 0) return null;

    return this.mapRowToTarotist(result.values[0]);
  }

  async getTarotistByName(name: string): Promise<Tarotist | null> {
    const db = await this.getDb();
    const result = await db.query(
      'SELECT * FROM tarotists WHERE name = ? AND deletedAt IS NULL',
      [name]
    );
    
    if (!result.values || result.values.length === 0) return null;

    return this.mapRowToTarotist(result.values[0]);
  }

  async getAllTarotists(): Promise<Tarotist[]> {
    const db = await this.getDb();
    const result = await db.query(
      'SELECT * FROM tarotists WHERE deletedAt IS NULL ORDER BY "order"'
    );
    
    if (!result.values) return [];

    return result.values.map(row => this.mapRowToTarotist(row));
  }

  async updateTarotist(
    id: string,
    updates: Partial<
      Omit<
        Tarotist,
        "id" | "createdAt" | "updatedAt" | "readings" | "chatMessages" | "plan"
      >
    > & {
      planId?: string;
    }
  ): Promise<void> {
    const db = await this.getDb();
    const now = this.dateToString(new Date());
    
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon);
    }
    if (updates.trait !== undefined) {
      fields.push('trait = ?');
      values.push(updates.trait);
    }
    if (updates.bio !== undefined) {
      fields.push('bio = ?');
      values.push(updates.bio);
    }
    if (updates.provider !== undefined) {
      fields.push('provider = ?');
      values.push(updates.provider);
    }
    if (updates.quality !== undefined) {
      fields.push('quality = ?');
      values.push(updates.quality);
    }
    if (updates.order !== undefined) {
      fields.push('"order" = ?');
      values.push(updates.order);
    }
    if (updates.planId !== undefined) {
      fields.push('planId = ?');
      values.push(updates.planId);
    }
    if (updates.primaryColor !== undefined) {
      fields.push('primaryColor = ?');
      values.push(updates.primaryColor);
    }
    if (updates.secondaryColor !== undefined) {
      fields.push('secondaryColor = ?');
      values.push(updates.secondaryColor);
    }
    if (updates.accentColor !== undefined) {
      fields.push('accentColor = ?');
      values.push(updates.accentColor);
    }
    if (updates.avatarUrl !== undefined) {
      fields.push('avatarUrl = ?');
      values.push(updates.avatarUrl);
    }
    if (updates.cost !== undefined) {
      fields.push('cost = ?');
      values.push(updates.cost);
    }

    fields.push('updatedAt = ?');
    values.push(now);
    values.push(id);

    await db.run(
      `UPDATE tarotists SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async softDeleteTarotist(id: string): Promise<void> {
    const db = await this.getDb();
    const now = this.dateToString(new Date());

    await db.run(
      'UPDATE tarotists SET deletedAt = ?, updatedAt = ? WHERE id = ?',
      [now, now, id]
    );
  }

  // ==================== Helper ====================

  private mapRowToTarotist(row: any): Tarotist {
    return {
      id: row.id,
      name: row.name,
      title: row.title,
      icon: row.icon,
      trait: row.trait,
      bio: row.bio,
      provider: row.provider,
      quality: row.quality,
      order: row.order,
      planId: row.planId,
      primaryColor: row.primaryColor,
      secondaryColor: row.secondaryColor,
      accentColor: row.accentColor,
      avatarUrl: row.avatarUrl,
      cost: row.cost,
      deletedAt: row.deletedAt ? this.stringToDate(row.deletedAt) : undefined,
      createdAt: this.stringToDate(row.createdAt),
      updatedAt: this.stringToDate(row.updatedAt),
    };
  }
}

export const tarotistRepository = new TarotistRepository();
