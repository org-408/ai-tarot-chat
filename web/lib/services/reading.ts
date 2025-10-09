import type { Reading, Spread, TarotCard } from "@/../shared/lib/types";
import { clientRepository } from "@/lib/repositories/client";
import { prisma } from "@/lib/repositories/database";
import { planRepository } from "@/lib/repositories/plan";
import { readingRepository } from "@/lib/repositories/reading";

export class ReadingService {
  /**
   * 占い履歴取得（ビジネスロジック）
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

  async drawRandomCards(
    readingId: string,
    cards: TarotCard[],
    spread: Spread
  ): Promise<void> {
    if (!spread.cells) return;
    const count = spread.cells.length;
    // Fisher-Yatesシャッフル
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    await prisma.drawnCard.createMany({
      data: shuffled.slice(0, count).map((card, index) => ({
        readingId,
        cardId: card.id,
        x: spread.cells![index].x,
        y: spread.cells![index].y,
        isReversed: Math.random() < 0.5,
        order: index,
      })),
    });
  }
}

export const readingService = new ReadingService();
