import type {
  SpreadCell,
  SpreadInput,
  SpreadWithLevelPlanCategories,
} from "@/../shared/lib/types";
import { spreadRepository } from "../repositories";
import { BaseRepository } from "../repositories/base";

export class SpreadService {
  // -------- Spread操作 --------

  /**
   * スプレッド一覧の取得
   */
  async getAllSpreads() {
    return await spreadRepository.getAllSpreads();
  }

  /**
   * スプレッドの取得
   */
  async getSpreadById(id: string) {
    return await spreadRepository.getSpreadById(id);
  }

  /**
   * スプレッドの作成
   * cellsも一緒に作成可能
   */
  async createSpread(
    spreadData: SpreadInput,
    cells?: Array<Omit<SpreadCell, "id" | "spread" | "spreadId">>
  ) {
    return await spreadRepository.createSpread(spreadData, cells);
  }

  /**
   * スプレッドの作成（コード指定版）
   * cellsも一緒に作成可能
   * levelCode, planCode, categoriesで指定
   */
  async createSpreadWithLevelPlanCategories(
    data: SpreadWithLevelPlanCategories,
    cells?: Array<Omit<SpreadCell, "id" | "spread" | "spreadId">>
  ) {
    return await spreadRepository.createSpreadWithLevelPlanCategories(
      data,
      cells
    );
  }

  /**
   * スプレッドの更新
   * cellsも一緒に更新可能（既存cellsを削除して新規作成）
   */
  async updateSpreadById(
    id: string,
    spreadData: SpreadInput,
    cells?: Array<Omit<SpreadCell, "id" | "spread" | "spreadId">>
  ) {
    return await spreadRepository.updateSpread(id, spreadData, cells);
  }

  /**
   * スプレッドの削除
   * 関連データ（カテゴリリンク、セル）も一緒に削除
   */
  async deleteSpreadById(id: string) {
    const spread = await spreadRepository.getSpreadById(id);
    if (!spread) throw new Error("スプレッドが見つかりません");

    // トランザクション内で関連データを削除
    return BaseRepository.transaction(
      { spread: spreadRepository },
      async ({ spread: spreadRepo }) => {
        await spreadRepo.deleteSpreadWithRelations(id);
        return { success: true };
      }
    );
  }

  // -------- SpreadCell操作 --------

  /**
   * 特定のスプレッドのセル一覧を取得
   */
  async getSpreadCellsBySpreadId(spreadId: string) {
    return await spreadRepository.getCellsBySpreadId(spreadId);
  }

  /**
   * 特定のセルを取得
   */
  async getSpreadCellById(id: string) {
    return await spreadRepository.getSpreadCellById(id);
  }

  /**
   * 新しいセルを作成
   */
  async createSpreadCell(
    spreadId: string,
    cellData: Omit<SpreadCell, "id" | "spread">
  ) {
    return await spreadRepository.createSpreadCell({
      ...cellData,
      spreadId,
    });
  }

  /**
   * セルを更新
   */
  async updateSpreadCellById(
    id: string,
    cellData: Omit<SpreadCell, "id" | "spread" | "spreadId">
  ) {
    const existingCell = await spreadRepository.getSpreadCellById(id);
    if (!existingCell) throw new Error("セルが見つかりません");

    return await spreadRepository.updateSpreadCell(id, cellData);
  }

  /**
   * セルを削除
   */
  async deleteSpreadCellById(id: string) {
    const cell = await spreadRepository.getSpreadCellById(id);
    if (!cell) throw new Error("セルが見つかりません");

    await spreadRepository.deleteSpreadCell(id);
    return { success: true };
  }

  /**
   * カテゴリごとのスプレッド一覧を取得
   */
  async getSpreadsByCategory(categoryId: string) {
    return await spreadRepository.getSpreadsByCategoryId(categoryId);
  }

  /**
   * レベル一覧を取得
   */
  async getAllSpreadLevels() {
    return await spreadRepository.getAllSpreadLevels();
  }

  /**
   * カテゴリ一覧を取得
   */
  async getAllReadingCategories() {
    return await spreadRepository.getAllReadingCategories();
  }
}

export const spreadService = new SpreadService();
