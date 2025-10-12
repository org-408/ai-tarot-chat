import type {
  ReadingCategory,
  Spread,
  SpreadCell,
  SpreadInput,
  SpreadLevel,
  SpreadLevelInput,
  SpreadWithLevelPlanCategories,
} from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class SpreadRepository extends BaseRepository {
  // ==================== SpreadLevel ====================
  async createSpreadLevel(level: SpreadLevelInput): Promise<string> {
    const created = await this.db.spreadLevel.create({
      data: {
        ...level,
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
    >,
    cells?: Array<Omit<SpreadCell, "id" | "spread" | "spreadId">>
  ): Promise<Spread> {
    const created = await this.db.spread.create({
      data: {
        no: spread.no,
        code: spread.code,
        name: spread.name,
        category: spread.category,
        levelId: spread.levelId,
        planId: spread.planId,
        guide: spread.guide,
        // cellsが指定されている場合は一緒に作成
        ...(cells && {
          cells: {
            create: cells.map((cell) => ({
              x: cell.x,
              y: cell.y,
              vLabel: cell.vLabel || null,
              hLabel: cell.hLabel || null,
              vOrder: cell.vOrder || null,
              hOrder: cell.hOrder || null,
            })),
          },
        }),
      },
      include: {
        cells: true,
        level: true,
        plan: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return created;
  }

  async createSpreadWithLevelPlanCategories(
    spread: SpreadWithLevelPlanCategories,
    cells?: Array<Omit<SpreadCell, "id" | "spread" | "spreadId">>
  ): Promise<Spread> {
    const { levelCode, planCode } = spread;
    return await this.db.spread.create({
      data: {
        no: spread.no,
        code: spread.code,
        name: spread.name,
        category: spread.category,
        level: { connect: { code: levelCode } },
        plan: { connect: { code: planCode } },
        guide: spread.guide,
        // cellsが指定されている場合は一緒に作成
        ...(cells && {
          cells: {
            create: cells.map((cell) => ({
              x: cell.x,
              y: cell.y,
              vLabel: cell.vLabel || null,
              hLabel: cell.hLabel || null,
              vOrder: cell.vOrder || null,
              hOrder: cell.hOrder || null,
            })),
          },
        }),
        // categoriesが指定されている場合は一緒にリンク作成
        ...(spread.categories &&
          spread.categories.length > 0 && {
            categories: {
              create: spread.categories.map((cat) => ({
                category: {
                  connectOrCreate: {
                    where: { name: cat.name },
                    create: {
                      no: cat.no,
                      name: cat.name,
                      description:
                        cat.description || `${cat}に関するタロットリーディング`,
                    },
                  },
                },
              })),
            },
          }),
      },
      include: {
        cells: true,
        level: true,
        plan: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  async updateSpread(
    id: string,
    spread: SpreadInput,
    cells?: Array<Omit<SpreadCell, "id" | "spread" | "spreadId">>
  ): Promise<Spread> {
    return await this.db.spread.update({
      where: { id },
      data: {
        name: spread.name,
        category: spread.category,
        levelId: spread.levelId,
        planId: spread.planId,
        guide: spread.guide,
        // cellsが指定されている場合は、既存のcellsを削除して新しいcellsを作成
        ...(cells && {
          cells: {
            deleteMany: {},
            create: cells.map((cell) => ({
              x: cell.x,
              y: cell.y,
              vLabel: cell.vLabel || null,
              hLabel: cell.hLabel || null,
              vOrder: cell.vOrder || null,
              hOrder: cell.hOrder || null,
            })),
          },
        }),
      },
      include: {
        cells: true,
        level: true,
        plan: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  async getSpreadById(id: string): Promise<Spread | null> {
    return await this.db.spread.findUnique({
      where: { id },
      include: {
        cells: true,
        level: true,
        plan: true,
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
      include: {
        cells: true,
        level: true,
        plan: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  /**
   * スプレッドと関連データを削除
   * カテゴリリンクとセルも一緒に削除する
   */
  async deleteSpreadWithRelations(spreadId: string): Promise<void> {
    // 関連するカテゴリリンクを削除
    await this.db.spreadToCategory.deleteMany({
      where: { spreadId },
    });

    // 関連するセルを削除
    await this.db.spreadCell.deleteMany({
      where: { spreadId },
    });

    // スプレッド本体を削除
    await this.db.spread.delete({
      where: { id: spreadId },
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

  async getSpreadCellById(id: string): Promise<SpreadCell | null> {
    return await this.db.spreadCell.findUnique({
      where: { id },
    });
  }

  async getCellsBySpreadId(spreadId: string): Promise<SpreadCell[]> {
    return await this.db.spreadCell.findMany({
      where: { spreadId },
      orderBy: [{ vOrder: "asc" }, { hOrder: "asc" }],
    });
  }

  async updateSpreadCell(
    id: string,
    cellData: Omit<SpreadCell, "id" | "spread" | "spreadId">
  ): Promise<SpreadCell> {
    return await this.db.spreadCell.update({
      where: { id },
      data: {
        x: cellData.x,
        y: cellData.y,
        vLabel: cellData.vLabel || null,
        hLabel: cellData.hLabel || null,
        vOrder: cellData.vOrder || null,
        hOrder: cellData.hOrder || null,
      },
    });
  }

  async deleteSpreadCell(id: string): Promise<void> {
    await this.db.spreadCell.delete({
      where: { id },
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
        no: category.no,
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

  async getReadingCategoryByName(
    name: string
  ): Promise<ReadingCategory | null> {
    return await this.db.readingCategory.findUnique({
      where: { name },
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
      include: {
        spread: {
          include: {
            cells: true,
            level: true,
            plan: true,
            categories: {
              include: {
                category: true,
              },
            },
          },
        },
      },
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
