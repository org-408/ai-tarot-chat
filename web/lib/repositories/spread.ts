import type {
  ReadingCategory,
  Spread,
  SpreadCell,
  SpreadLevel,
} from "@/../../shared/lib/types";
import { BaseRepository } from "./base";

export class SpreadRepository extends BaseRepository {
  // ==================== SpreadLevel ====================
  async createSpreadLevel(
    level: Omit<SpreadLevel, "id" | "createdAt" | "updatedAt" | "spreads">
  ): Promise<string> {
    const created = await this.db.spreadLevel.create({
      data: {
        code: level.code,
        name: level.name,
        description: level.description,
      },
    });

    return created.id;
  }

  async getSpreadLevelById(id: string): Promise<SpreadLevel | null> {
    return await this.db.spreadLevel.findUnique({
      where: { id },
      include: { spreads: true },
    });
  }

  async getSpreadLevelByCode(code: string): Promise<SpreadLevel | null> {
    return await this.db.spreadLevel.findUnique({
      where: { code },
      include: { spreads: true },
    });
  }

  async getAllSpreadLevels(): Promise<SpreadLevel[]> {
    return await this.db.spreadLevel.findMany({
      orderBy: { createdAt: "asc" },
    });
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
    const created = await this.db.spread.create({
      data: {
        code: spread.code,
        name: spread.name,
        category: spread.category,
        levelId: spread.levelId,
        planId: spread.planId,
        guide: spread.guide,
      },
    });

    return created.id;
  }

  async getSpreadById(id: string): Promise<Spread | null> {
    return await this.db.spread.findUnique({
      where: { id },
      include: {
        cells: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  async getSpreadByCode(code: string): Promise<Spread | null> {
    return await this.db.spread.findUnique({
      where: { code },
      include: {
        cells: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  async getSpreadsByLevelId(levelId: string): Promise<Spread[]> {
    return await this.db.spread.findMany({
      where: { levelId },
      orderBy: { createdAt: "asc" },
      include: { cells: true },
    });
  }

  async getSpreadsByPlanId(planId: string): Promise<Spread[]> {
    return await this.db.spread.findMany({
      where: { planId },
      orderBy: { createdAt: "asc" },
      include: { cells: true },
    });
  }

  async getAllSpreads(): Promise<Spread[]> {
    return await this.db.spread.findMany({
      orderBy: { createdAt: "asc" },
      include: { cells: true },
    });
  }

  // ==================== SpreadCell ====================
  async createSpreadCell(
    cell: Omit<SpreadCell, "id" | "spread">
  ): Promise<string> {
    const created = await this.db.spreadCell.create({
      data: {
        x: cell.x,
        y: cell.y,
        vLabel: cell.vLabel,
        hLabel: cell.hLabel,
        vOrder: cell.vOrder,
        hOrder: cell.hOrder,
        spreadId: cell.spreadId,
      },
    });

    return created.id;
  }

  async getCellsBySpreadId(spreadId: string): Promise<SpreadCell[]> {
    return await this.db.spreadCell.findMany({
      where: { spreadId },
      orderBy: [{ vOrder: "asc" }, { hOrder: "asc" }],
    });
  }

  async deleteCellsBySpreadId(spreadId: string): Promise<void> {
    await this.db.spreadCell.deleteMany({
      where: { spreadId },
    });
  }

  // ==================== ReadingCategory ====================
  async createReadingCategory(
    category: Omit<
      ReadingCategory,
      "id" | "createdAt" | "updatedAt" | "spreads" | "reading"
    >
  ): Promise<string> {
    const created = await this.db.readingCategory.create({
      data: {
        name: category.name,
        description: category.description,
      },
    });

    return created.id;
  }

  async getReadingCategoryById(id: string): Promise<ReadingCategory | null> {
    return await this.db.readingCategory.findUnique({
      where: { id },
    });
  }

  async getAllReadingCategories(): Promise<ReadingCategory[]> {
    return await this.db.readingCategory.findMany({
      orderBy: { createdAt: "asc" },
    });
  }

  // ==================== SpreadToCategory ====================
  async linkSpreadToCategory(
    spreadId: string,
    categoryId: string
  ): Promise<string> {
    const created = await this.db.spreadToCategory.create({
      data: {
        spreadId,
        categoryId,
      },
    });

    return created.id;
  }

  async getCategoriesBySpreadId(spreadId: string): Promise<ReadingCategory[]> {
    const links = await this.db.spreadToCategory.findMany({
      where: { spreadId },
      include: { category: true },
    });

    return links.map((link) => link.category);
  }

  async getSpreadsByCategoryId(categoryId: string): Promise<Spread[]> {
    const links = await this.db.spreadToCategory.findMany({
      where: { categoryId },
      include: { spread: true },
    });

    return links.map((link) => link.spread);
  }

  async unlinkSpreadFromCategory(
    spreadId: string,
    categoryId: string
  ): Promise<void> {
    await this.db.spreadToCategory.deleteMany({
      where: {
        spreadId,
        categoryId,
      },
    });
  }
}

export const spreadRepository = new SpreadRepository();
