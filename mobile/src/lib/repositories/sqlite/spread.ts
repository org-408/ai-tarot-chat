/**
 * Spread Repository (SQLite版)
 *
 * Prisma版のSpreadRepositoryをSQLite用に移植
 */

import { v4 as uuidv4 } from "uuid";
import type {
  ReadingCategory,
  Spread,
  SpreadCell,
  SpreadLevel,
} from "../../../../../shared/lib/types";
import type {
  ReadingCategoryRow,
  SpreadCellRow,
  SpreadLevelRow,
  SpreadRow,
} from "../../database/types";
import { BaseRepository } from "./base";

export class SpreadRepository extends BaseRepository {
  // ==================== SpreadLevel ====================

  async createSpreadLevel(
    level: Omit<SpreadLevel, "id" | "createdAt" | "updatedAt" | "spreads">
  ): Promise<string> {
    const db = await this.getDb();
    const id = uuidv4();
    const now = this.dateToString(new Date());

    await db.run(
      `INSERT INTO spread_levels (id, code, name, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, level.code, level.name, level.description, now, now]
    );

    return id;
  }

  async getSpreadLevelById(id: string): Promise<SpreadLevel | null> {
    const db = await this.getDb();
    const result = await db.query("SELECT * FROM spread_levels WHERE id = ?", [
      id,
    ]);

    if (!result.values || result.values.length === 0) return null;

    return this.mapRowToLevel(result.values[0]);
  }

  async getSpreadLevelByCode(code: string): Promise<SpreadLevel | null> {
    const db = await this.getDb();
    const result = await db.query(
      "SELECT * FROM spread_levels WHERE code = ?",
      [code]
    );

    if (!result.values || result.values.length === 0) return null;

    return this.mapRowToLevel(result.values[0]);
  }

  async getAllSpreadLevels(): Promise<SpreadLevel[]> {
    const db = await this.getDb();
    const result = await db.query(
      "SELECT * FROM spread_levels ORDER BY createdAt"
    );

    if (!result.values) return [];

    return result.values.map((row) => this.mapRowToLevel(row));
  }

  // ==================== Spread ====================

  async createSpread(
    spread: Omit<
      Spread,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "cells"
      | "categories"
      | "reading"
      | "favoriteSpreads"
    >
  ): Promise<string> {
    const db = await this.getDb();
    const id = uuidv4();
    const now = this.dateToString(new Date());

    await db.run(
      `INSERT INTO spreads (id, code, name, category, guide, planId, levelId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        spread.code,
        spread.name,
        spread.category,
        spread.guide,
        spread.planId,
        spread.levelId,
        now,
        now,
      ]
    );

    return id;
  }

  async getSpreadById(id: string): Promise<Spread | null> {
    const db = await this.getDb();
    const result = await db.query("SELECT * FROM spreads WHERE id = ?", [id]);

    if (!result.values || result.values.length === 0) return null;

    return await this.mapRowToSpread(result.values[0]);
  }

  async getSpreadByCode(code: string): Promise<Spread | null> {
    const db = await this.getDb();
    const result = await db.query("SELECT * FROM spreads WHERE code = ?", [
      code,
    ]);

    if (!result.values || result.values.length === 0) return null;

    return await this.mapRowToSpread(result.values[0]);
  }

  async getSpreadsByLevelId(levelId: string): Promise<Spread[]> {
    const db = await this.getDb();
    const result = await db.query(
      "SELECT * FROM spreads WHERE levelId = ? ORDER BY createdAt",
      [levelId]
    );

    if (!result.values) return [];

    return await Promise.all(
      result.values.map((row) => this.mapRowToSpread(row))
    );
  }

  async getSpreadsByPlanId(planId: string): Promise<Spread[]> {
    const db = await this.getDb();
    const result = await db.query(
      "SELECT * FROM spreads WHERE planId = ? ORDER BY createdAt",
      [planId]
    );

    if (!result.values) return [];

    return await Promise.all(
      result.values.map((row) => this.mapRowToSpread(row))
    );
  }

  async getAllSpreads(): Promise<Spread[]> {
    const db = await this.getDb();
    const result = await db.query("SELECT * FROM spreads ORDER BY createdAt");

    if (!result.values) return [];

    return await Promise.all(
      result.values.map((row) => this.mapRowToSpread(row))
    );
  }

  // ==================== SpreadCell ====================

  async createSpreadCell(
    cell: Omit<SpreadCell, "id" | "spread">
  ): Promise<string> {
    const db = await this.getDb();
    const id = uuidv4();

    await db.run(
      `INSERT INTO spread_cells (id, spreadId, x, y, vLabel, hLabel, vOrder, hOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        cell.spreadId,
        cell.x,
        cell.y,
        cell.vLabel,
        cell.hLabel,
        cell.vOrder,
        cell.hOrder,
      ]
    );

    return id;
  }

  async getCellsBySpreadId(spreadId: string): Promise<SpreadCell[]> {
    const db = await this.getDb();
    const result = await db.query(
      "SELECT * FROM spread_cells WHERE spreadId = ? ORDER BY vOrder, hOrder",
      [spreadId]
    );

    if (!result.values) return [];

    return result.values.map((row) => this.mapRowToCell(row));
  }

  async deleteCellsBySpreadId(spreadId: string): Promise<void> {
    const db = await this.getDb();
    await db.run("DELETE FROM spread_cells WHERE spreadId = ?", [spreadId]);
  }

  // ==================== ReadingCategory ====================

  async createReadingCategory(
    category: Omit<
      ReadingCategory,
      "id" | "createdAt" | "updatedAt" | "spreads" | "reading"
    >
  ): Promise<string> {
    const db = await this.getDb();
    const id = uuidv4();
    const now = this.dateToString(new Date());

    await db.run(
      `INSERT INTO reading_categories (id, name, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [id, category.name, category.description, now, now]
    );

    return id;
  }

  async getReadingCategoryById(id: string): Promise<ReadingCategory | null> {
    const db = await this.getDb();
    const result = await db.query(
      "SELECT * FROM reading_categories WHERE id = ?",
      [id]
    );

    if (!result.values || result.values.length === 0) return null;

    return this.mapRowToCategory(result.values[0]);
  }

  async getReadingCategoryByName(
    name: string
  ): Promise<ReadingCategory | null> {
    const db = await this.getDb();
    const result = await db.query(
      "SELECT * FROM reading_categories WHERE name = ?",
      [name]
    );

    if (!result.values || result.values.length === 0) return null;

    return this.mapRowToCategory(result.values[0]);
  }

  async getAllReadingCategories(): Promise<ReadingCategory[]> {
    const db = await this.getDb();
    const result = await db.query(
      "SELECT * FROM reading_categories ORDER BY createdAt"
    );

    if (!result.values) return [];

    return result.values.map((row) => this.mapRowToCategory(row));
  }

  // ==================== SpreadToCategory ====================

  async linkSpreadToCategory(
    spreadId: string,
    categoryId: string
  ): Promise<string> {
    const db = await this.getDb();
    const id = uuidv4();

    await db.run(
      `INSERT OR IGNORE INTO spread_to_category (id, spreadId, categoryId)
       VALUES (?, ?, ?)`,
      [id, spreadId, categoryId]
    );

    return id;
  }

  async getCategoriesBySpreadId(spreadId: string): Promise<ReadingCategory[]> {
    const db = await this.getDb();
    const result = await db.query(
      `SELECT c.* FROM reading_categories c
       INNER JOIN spread_to_category stc ON c.id = stc.categoryId
       WHERE stc.spreadId = ?`,
      [spreadId]
    );

    if (!result.values) return [];

    return result.values.map((row) => this.mapRowToCategory(row));
  }

  async getSpreadsByCategoryId(categoryId: string): Promise<Spread[]> {
    const db = await this.getDb();
    const result = await db.query(
      `SELECT s.* FROM spreads s
       INNER JOIN spread_to_category stc ON s.id = stc.spreadId
       WHERE stc.categoryId = ?`,
      [categoryId]
    );

    if (!result.values) return [];

    return await Promise.all(
      result.values.map((row) => this.mapRowToSpread(row))
    );
  }

  async unlinkSpreadFromCategory(
    spreadId: string,
    categoryId: string
  ): Promise<void> {
    const db = await this.getDb();
    await db.run(
      "DELETE FROM spread_to_category WHERE spreadId = ? AND categoryId = ?",
      [spreadId, categoryId]
    );
  }

  // ==================== Helper ====================

  private mapRowToLevel(row: SpreadLevelRow): SpreadLevel {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      createdAt: this.stringToDate(row.createdAt),
      updatedAt: this.stringToDate(row.updatedAt),
    };
  }

  private async mapRowToSpread(row: SpreadRow): Promise<Spread> {
    // Cells と Categories を取得
    const cells = await this.getCellsBySpreadId(row.id);
    const categories = await this.getCategoriesBySpreadId(row.id);

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      guide: row.guide,
      planId: row.planId,
      levelId: row.levelId,
      cells,
      categories: categories.map((cat) => ({
        spreadId: row.id,
        categoryId: cat.id,
        category: cat,
      })),
      createdAt: this.stringToDate(row.createdAt),
      updatedAt: this.stringToDate(row.updatedAt),
    };
  }

  private mapRowToCell(row: SpreadCellRow): SpreadCell {
    return {
      id: row.id,
      spreadId: row.spreadId,
      x: row.x,
      y: row.y,
      vLabel: row.vLabel,
      hLabel: row.hLabel,
      vOrder: row.vOrder,
      hOrder: row.hOrder,
    };
  }

  private mapRowToCategory(row: ReadingCategoryRow): ReadingCategory {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: this.stringToDate(row.createdAt),
      updatedAt: this.stringToDate(row.updatedAt),
    };
  }
}

export const spreadRepository = new SpreadRepository();
