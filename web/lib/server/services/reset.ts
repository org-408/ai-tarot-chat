import { logWithContext } from "@/lib/server/logger/logger";
import { resetRepository } from "@/lib/server/repositories/reset";

/**
 * 開発・ステージング環境専用のリセットサービス。
 * 本番環境では絶対に実行しない。
 *
 * FK 制約の順序に従い全テーブルを削除する処理を orchestrate する。
 */
export class ResetService {
  async resetDatabase(): Promise<void> {
    logWithContext("info", "[ResetService] Starting database reset");

    await resetRepository.deleteReadingData();
    await resetRepository.deleteClientData();
    await resetRepository.deleteAuthData();

    logWithContext("info", "[ResetService] Database reset completed");
  }
}

export const resetService = new ResetService();
