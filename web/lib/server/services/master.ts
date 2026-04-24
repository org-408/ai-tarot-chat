import type {
  MasterData,
  MasterDataUpdateResponse,
} from "@/../shared/lib/types";
import { applyEnTranslations } from "@/lib/server/i18n/apply-translations";
import { logWithContext } from "@/lib/server/logger/logger";
import { masterConfigRepository } from "@/lib/server/repositories";
import {
  planService,
  spreadService,
  tarotistService,
  tarotService,
} from "@/lib/server/services";

export class MasterService {
  /**
   * マスターバージョン取得
   */
  async getMasterVersion(): Promise<string> {
    const config = await masterConfigRepository.getMasterConfigByKey(
      "MASTER_VERSION"
    );
    return config?.version || "1.0.0";
  }

  /**
   * 全マスタデータを一括取得
   * 読み取り専用のため、トランザクションは不要
   *
   * decks は Phase 2.1 以降、ja/en 両方を返す。クライアント側で
   * 現在のロケールに応じてフィルタする (mobile/src/lib/hooks/use-master.ts)。
   */
  async getAllMasterData(): Promise<MasterData> {
    const [version, plans, levels, categories, spreads, decks, tarotists] =
      await Promise.all([
        this.getMasterVersion(),
        planService.getPlans(),
        spreadService.getAllSpreadLevels(),
        spreadService.getAllReadingCategories(),
        spreadService.getAllSpreads(),
        tarotService.getAllDecks(true),
        tarotistService.getAllTarotists(),
      ]);

    return applyEnTranslations({
      version,
      plans,
      levels,
      categories,
      spreads,
      decks,
      tarotists,
    });
  }

  /**
   * マスターデータの更新をチェック
   * @param version - クライアントが保持している最終更新日時（ISO文字列）
   * @returns 更新が必要な場合 true
   */
  async checkMasterDataUpdates(
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
}

export const masterService = new MasterService();
