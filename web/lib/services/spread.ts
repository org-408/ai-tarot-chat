import type { SpreadCell, SpreadInput } from "@/../shared/lib/types";
import { prisma } from "@/prisma/prisma";
import { spreadRepository } from "../repositories";

// -------- Spread操作 --------

// スプレッド一覧の取得
export async function getSpreads() {
  return await spreadRepository.getAllSpreads();
}

// スプレッドの取得
export async function getSpreadById(id: string) {
  return await spreadRepository.getSpreadById(id);
}

// スプレッドの作成
export async function createSpread(spreadData: SpreadInput) {
  return await spreadRepository.createSpread(spreadData);
}

// スプレッドの更新
export async function updateSpreadById(id: string, spreadData: SpreadInput) {
  return await spreadRepository.updateSpread(id, spreadData);
}

// スプレッドの削除
export async function deleteSpreadById(id: string) {
  const spread = await prisma.spread.findUnique({
    where: { id },
  });

  if (!spread) throw new Error("スプレッドが見つかりません");

  await prisma.$transaction(async (tx) => {
    // 関連するカテゴリ関連を削除
    await tx.spreadToCategory.deleteMany({
      where: { spreadId: id },
    });

    // 関連するcellsを削除
    await tx.spreadCell.deleteMany({
      where: { spreadId: id },
    });

    // Spreadを削除
    await tx.spread.delete({
      where: { id },
    });
  });

  return { success: true };
}

// -------- SpreadCell操作 --------

// 特定のスプレッドのセル一覧を取得
export async function getSpreadCellsBySpreadId(spreadId: string) {
  const cells = await prisma.spreadCell.findMany({
    where: { spreadId },
    orderBy: [{ vOrder: "asc" }, { hOrder: "asc" }],
  });

  return cells.map((cell) => ({
    id: cell.id,
    x: cell.x,
    y: cell.y,
    vLabel: cell.vLabel || null,
    hLabel: cell.hLabel || null,
    vOrder: cell.vOrder || null,
    hOrder: cell.hOrder || null,
    spreadId: cell.spreadId,
  }));
}

// 特定のセルを取得
export async function getSpreadCellById(id: string) {
  const cell = await prisma.spreadCell.findUnique({
    where: { id },
  });

  if (!cell) return null;

  return {
    id: cell.id,
    x: cell.x,
    y: cell.y,
    vLabel: cell.vLabel || null,
    hLabel: cell.hLabel || null,
    vOrder: cell.vOrder || null,
    hOrder: cell.hOrder || null,
    spreadId: cell.spreadId,
  };
}

// 新しいセルを作成
export async function createSpreadCell(
  spreadId: string,
  cellData: Omit<SpreadCell, "id" | "spread">
) {
  const cell = await prisma.spreadCell.create({
    data: {
      spreadId,
      x: cellData.x,
      y: cellData.y,
      vLabel: cellData.vLabel || null,
      hLabel: cellData.hLabel || null,
      vOrder: cellData.vOrder || null,
      hOrder: cellData.hOrder || null,
    },
  });

  return {
    id: cell.id,
    x: cell.x,
    y: cell.y,
    vLabel: cell.vLabel || null,
    hLabel: cell.hLabel || null,
    vOrder: cell.vOrder || null,
    hOrder: cell.hOrder || null,
    spreadId: cell.spreadId,
  };
}

// セルを更新
export async function updateSpreadCellById(
  id: string,
  cellData: Omit<SpreadCell, "id" | "spread">
) {
  const existingCell = await prisma.spreadCell.findUnique({
    where: { id },
  });

  if (!existingCell) throw new Error("セルが見つかりません");

  const cell = await prisma.spreadCell.update({
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

  return {
    id: cell.id,
    x: cell.x,
    y: cell.y,
    vLabel: cell.vLabel || null,
    hLabel: cell.hLabel || null,
    vOrder: cell.vOrder || null,
    hOrder: cell.hOrder || null,
    spreadId: cell.spreadId,
  };
}

// セルを削除
export async function deleteSpreadCellById(id: string) {
  const cell = await prisma.spreadCell.findUnique({
    where: { id },
  });

  if (!cell) throw new Error("セルが見つかりません");

  await prisma.spreadCell.delete({
    where: { id },
  });

  return { success: true };
}

// 複数のセルを一括更新（位置の変更など）
export async function bulkUpdateSpreadCells(cells: SpreadCell[]) {
  const updates = cells.map((cell) =>
    prisma.spreadCell.update({
      where: { id: cell.id },
      data: {
        x: cell.x,
        y: cell.y,
        vLabel: cell.vLabel || null,
        hLabel: cell.hLabel || null,
        vOrder: cell.vOrder || null,
        hOrder: cell.hOrder || null,
      },
    })
  );

  await prisma.$transaction(updates);
  return { success: true };
}

// カテゴリごとのスプレッド一覧を取得
export async function getSpreadsByCategory(categoryId: string) {
  const spreads = await prisma.spread.findMany({
    where: {
      categories: {
        some: {
          categoryId,
        },
      },
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

  return spreads.map((spread) => ({
    id: spread.id,
    code: spread.code,
    name: spread.name,
    category: spread.category,
    levelId: spread.levelId,
    level: spread.level,
    planId: spread.planId,
    plan: spread.plan,
    guide: spread.guide || "",
    createdAt: spread.createdAt,
    updatedAt: spread.updatedAt,
    cells: spread.cells.map((cell) => ({
      id: cell.id,
      x: cell.x,
      y: cell.y,
      vLabel: cell.vLabel || null,
      hLabel: cell.hLabel || null,
      vOrder: cell.vOrder || null,
      hOrder: cell.hOrder || null,
      spreadId: cell.spreadId,
    })),
    categories: spread.categories.map((c) => ({
      id: c.id,
      spreadId: c.spreadId,
      categoryId: c.categoryId,
      category: c.category,
    })),
  }));
}
