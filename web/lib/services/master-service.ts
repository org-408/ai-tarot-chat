import type { Plan, ReadingCategory, SpreadLevel } from "@/lib/types";
import { prisma } from "@/prisma/prisma";

// プラン一覧を取得
export async function getPlans(): Promise<Plan[]> {
  return await prisma.plan.findMany({
    orderBy: { id: "asc" },
  });
}

// スプレッドレベル一覧を取得
export async function getSpreadLevels(): Promise<SpreadLevel[]> {
  return await prisma.spreadLevel.findMany({
    orderBy: { id: "asc" },
  });
}

// 読み取りカテゴリ一覧を取得
export async function getReadingCategories(): Promise<ReadingCategory[]> {
  return await prisma.readingCategory.findMany({
    orderBy: { id: "asc" },
  });
}

// 全マスタデータを一括取得
export async function getAllMasterData() {
  const [plans, levels, categories] = await Promise.all([
    getPlans(),
    getSpreadLevels(),
    getReadingCategories(),
  ]);

  return {
    plans,
    levels,
    categories,
  };
}
