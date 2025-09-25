import type {
  ReadingCategory,
  Spread,
  SpreadCell,
  SpreadLevel,
} from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class SpreadRepository extends BaseRepository {
  // ==================== SpreadLevel ====================
  async createSpreadLevel(
    level: Omit<SpreadLevel, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO spread_levels (id, code, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, level.code, level.name, level.description, now, now]
    );

    return id;
  }

  async getSpreadLevelById(id: string): Promise<SpreadLevel | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM spread_levels WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToSpreadLevel(rows[0]);
  }

  async getSpreadLevelByCode(code: string): Promise<SpreadLevel | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM spread_levels WHERE code = ?`,
      [code]
    );

    if (rows.length === 0) return null;
    return this.mapRowToSpreadLevel(rows[0]);
  }

  async getAllSpreadLevels(): Promise<SpreadLevel[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM spread_levels ORDER BY created_at ASC`
    );

    return rows.map((row) => this.mapRowToSpreadLevel(row));
  }

  private mapRowToSpreadLevel(row: any): SpreadLevel {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      createdAt: this.fromTimestamp(row.created_at),
      updatedAt: this.fromTimestamp(row.updated_at),
    };
  }

  // ==================== Spread ====================
  async createSpread(
    spread: Omit<Spread, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO spreads (
        id, code, name, category, level_id, plan_id, guide, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        spread.code,
        spread.name,
        spread.category,
        spread.levelId,
        spread.planId,
        spread.guide ?? null,
        now,
        now,
      ]
    );

    return id;
  }

  async getSpreadById(id: string): Promise<Spread | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM spreads WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToSpread(rows[0]);
  }

  async getSpreadByCode(code: string): Promise<Spread | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM spreads WHERE code = ?`,
      [code]
    );

    if (rows.length === 0) return null;
    return this.mapRowToSpread(rows[0]);
  }

  async getSpreadsByLevelId(levelId: string): Promise<Spread[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM spreads WHERE level_id = ? ORDER BY created_at ASC`,
      [levelId]
    );

    return rows.map((row) => this.mapRowToSpread(row));
  }

  async getSpreadsByPlanId(planId: string): Promise<Spread[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM spreads WHERE plan_id = ? ORDER BY created_at ASC`,
      [planId]
    );

    return rows.map((row) => this.mapRowToSpread(row));
  }

  async getAllSpreads(): Promise<Spread[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM spreads ORDER BY created_at ASC`
    );

    return rows.map((row) => this.mapRowToSpread(row));
  }

  private mapRowToSpread(row: any): Spread {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      levelId: row.level_id,
      planId: row.plan_id,
      guide: row.guide,
      createdAt: this.fromTimestamp(row.created_at),
      updatedAt: this.fromTimestamp(row.updated_at),
    };
  }

  // ==================== SpreadCell ====================
  async createSpreadCell(cell: Omit<SpreadCell, "id">): Promise<string> {
    const id = crypto.randomUUID();

    await this.db.execute(
      `INSERT INTO spread_cells (
        id, x, y, v_label, h_label, v_order, h_order, spread_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        cell.x,
        cell.y,
        cell.vLabel ?? null,
        cell.hLabel ?? null,
        cell.vOrder ?? null,
        cell.hOrder ?? null,
        cell.spreadId,
      ]
    );

    return id;
  }

  async getCellsBySpreadId(spreadId: string): Promise<SpreadCell[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM spread_cells WHERE spread_id = ? ORDER BY v_order, h_order`,
      [spreadId]
    );

    return rows.map((row) => this.mapRowToSpreadCell(row));
  }

  async deleteCellsBySpreadId(spreadId: string): Promise<void> {
    await this.db.execute(`DELETE FROM spread_cells WHERE spread_id = ?`, [
      spreadId,
    ]);
  }

  private mapRowToSpreadCell(row: any): SpreadCell {
    return {
      id: row.id,
      x: row.x,
      y: row.y,
      vLabel: row.v_label,
      hLabel: row.h_label,
      vOrder: row.v_order,
      hOrder: row.h_order,
      spreadId: row.spread_id,
    };
  }

  // ==================== ReadingCategory ====================
  async createReadingCategory(
    category: Omit<ReadingCategory, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO reading_categories (id, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, category.name, category.description, now, now]
    );

    return id;
  }

  async getReadingCategoryById(id: string): Promise<ReadingCategory | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM reading_categories WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToReadingCategory(rows[0]);
  }

  async getAllReadingCategories(): Promise<ReadingCategory[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM reading_categories ORDER BY created_at ASC`
    );

    return rows.map((row) => this.mapRowToReadingCategory(row));
  }

  private mapRowToReadingCategory(row: any): ReadingCategory {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: this.fromTimestamp(row.created_at),
      updatedAt: this.fromTimestamp(row.updated_at),
    };
  }

  // ==================== SpreadToCategory ====================
  async linkSpreadToCategory(
    spreadId: string,
    categoryId: string
  ): Promise<string> {
    const id = crypto.randomUUID();

    await this.db.execute(
      `INSERT INTO spread_to_categories (id, spread_id, category_id) VALUES (?, ?, ?)`,
      [id, spreadId, categoryId]
    );

    return id;
  }

  async getCategoriesBySpreadId(spreadId: string): Promise<ReadingCategory[]> {
    const rows = await this.db.select<any[]>(
      `SELECT rc.* FROM reading_categories rc
       INNER JOIN spread_to_categories stc ON rc.id = stc.category_id
       WHERE stc.spread_id = ?`,
      [spreadId]
    );

    return rows.map((row) => this.mapRowToReadingCategory(row));
  }

  async getSpreadsByCategoryId(categoryId: string): Promise<Spread[]> {
    const rows = await this.db.select<any[]>(
      `SELECT s.* FROM spreads s
       INNER JOIN spread_to_categories stc ON s.id = stc.spread_id
       WHERE stc.category_id = ?`,
      [categoryId]
    );

    return rows.map((row) => this.mapRowToSpread(row));
  }

  async unlinkSpreadFromCategory(
    spreadId: string,
    categoryId: string
  ): Promise<void> {
    await this.db.execute(
      `DELETE FROM spread_to_categories WHERE spread_id = ? AND category_id = ?`,
      [spreadId, categoryId]
    );
  }
}

export const spreadRepository = new SpreadRepository();
