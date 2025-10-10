import type {
  MasterData,
  MasterDataUpdateResponse,
  Plan,
  ReadingCategory,
  SpreadLevel,
} from "@/../shared/lib/types";
import { masterConfigRepository } from "@/lib/repositories/master";
import { getSpreads } from "@/lib/services/spread";
import { getAllDecks } from "@/lib/services/tarot";
import { getTarotists } from "@/lib/services/tarotist";
import { prisma } from "@/prisma/prisma";
import { logWithContext } from "../logger/logger";
import { planService } from "./plan";

// 型定義（シンプルに boolean のみ返す）

// マスターバージョン取得
export async function getMasterVersion(): Promise<string> {
  const config = await masterConfigRepository.getMasterConfigByKey(
    "MASTER_VERSION"
  );
  return config?.version || "1.0.0";
}

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
export async function getAllMasterData(): Promise<MasterData> {
  const [version, plans, levels, categories, spreads, decks, tarotists] =
    await Promise.all([
      getMasterVersion(),
      getPlans(),
      getSpreadLevels(),
      getReadingCategories(),
      getSpreads(),
      getAllDecks(),
      getTarotists(),
    ]);

  return {
    version,
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
 * @param version - クライアントが保持している最終更新日時（ISO文字列）
 * @returns 更新が必要な場合 true
 */
export async function checkMasterDataUpdates(
  version?: string
): Promise<MasterDataUpdateResponse> {
  logWithContext("info", "マスターデータ更新チェック:", { version });

  const latest = await masterConfigRepository.getLatestMasterConfig();

  const needsUpdate = version !== latest?.version;

  const response: MasterDataUpdateResponse = {
    needsUpdate,
    latestVersion: latest?.version || "1.0.0",
    clientVersion: version || "unknown",
    updatedAt: latest?.updatedAt || new Date(0),
  };

  logWithContext("info", "更新チェック結果:", { ...response });

  return response;
}
