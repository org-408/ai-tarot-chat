import type { Reading } from "@/../shared/lib/types";
import {
  clientRepository,
  planRepository,
  readingRepository,
} from "@/lib/server/repositories";

export class ReadingService {
  /**
   * 占い履歴取得（ビジネスロジック）
   * 読み取り専用のため、トランザクションは不要
   */
  async getReadingHistory(clientId: string, limit = 20): Promise<Reading[]> {
    const client = await clientRepository.getClientById(clientId);
    if (!client) throw new Error("Client not found");

    const plan = await planRepository.getPlanById(client.planId);
    if (!plan) throw new Error("Plan not found");

    // プランに履歴機能がない場合はエラー
    if (!plan.hasHistory) {
      throw new Error("History feature not available in current plan");
    }

    return await readingRepository.getReadingsByClientId(clientId, limit);
  }
}

export const readingService = new ReadingService();
