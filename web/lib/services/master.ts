import type { MasterData, Plan, ReadingCategory, SpreadLevel } from "@/../shared/lib/types";
import { getSpreads } from "@/lib/services/spread";
import { getAllDecks } from "@/lib/services/tarot";
import { getTarotists } from "@/lib/services/tarotist";
import { prisma } from "@/prisma/prisma";
import { planService } from "./plan";

// 型定義（シンプルに boolean のみ返す）

// プラン一覧を取得
export async function getPlans(): Promise<Plan[]> {
  return await planService.getPlans();
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
export async function getAllMasterData(): Promise<MasterData>{
  const [plans, levels, categories, spreads, decks, tarotists] = await Promise.all([
    getPlans(),
    getSpreadLevels(),
    getReadingCategories(),
    getSpreads(),
    getAllDecks(),
    getTarotists(),
  ]);

  return {
    plans,
    levels,
    categories,
    spreads,
    decks,
    tarotists,
  };
}

/**
 * マスターデータの更新をチェック
 * @param lastUpdatedAt - クライアントが保持している最終更新日時（ISO文字列）
 * @returns 更新が必要な場合 true
 */
export async function checkMasterDataUpdates(
  lastUpdatedAt?: string
): Promise<boolean> {
  const clientLastUpdate = lastUpdatedAt
    ? new Date(lastUpdatedAt)
    : new Date(0);

  console.log("マスターデータ更新チェック:", {
    clientLastUpdate: clientLastUpdate.toISOString(),
  });

  // 各テーブルの最新更新日時を取得
  const [latestPlan, latestLevel, latestCategory] = await Promise.all([
    prisma.plan.findFirst({
      select: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.spreadLevel.findFirst({
      select: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.readingCategory.findFirst({
      select: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // 最新の更新日時を特定
  const updates = [
    latestPlan?.updatedAt,
    latestLevel?.updatedAt,
    latestCategory?.updatedAt,
  ].filter((date): date is Date => date !== null && date !== undefined);

  if (updates.length === 0) {
    // データが1件もない場合
    return true;
  }

  const serverLastUpdate = new Date(
    Math.max(...updates.map((d) => d.getTime()))
  );
  const needsUpdate = serverLastUpdate > clientLastUpdate;

  console.log("更新チェック結果:", {
    serverLastUpdate: serverLastUpdate.toISOString(),
    needsUpdate,
  });

  return needsUpdate;
}
