import type { Reading, Spread, TarotCard } from "@/../shared/lib/types";
import { clientRepository } from "@/lib/repositories/client";
import { prisma } from "@/lib/repositories/database";
import { planRepository } from "@/lib/repositories/plan";
import { readingRepository } from "@/lib/repositories/reading";
import { spreadRepository } from "@/lib/repositories/spread";
import { tarotRepository } from "@/lib/repositories/tarot";

export class ReadingService {
  /**
   * 占い実行（ビジネスロジック）
   */
  async executeReading(params: {
    clientId: string;
    deviceId: string;
    spreadId: string;
    categoryId: string;
    tarotistId: string;
  }): Promise<Reading> {
    // 1) ユーザー情報取得
    const client = await clientRepository.getClientById(params.clientId);
    if (!client) throw new Error("Client not found");

    // 2) プラン情報取得
    const plan = await planRepository.getPlanById(client.planId);
    if (!plan) throw new Error("Plan not found");

    // 3) 利用制限チェック（ビジネスルール）
    const today = new Date().toISOString().split("T")[0];
    const lastReading = client.lastReadingDate?.toISOString().split("T")[0];

    if (lastReading !== today) {
      // 日付が変わったらリセット
      client.dailyReadingsCount = 0;
    }

    if (client.dailyReadingsCount >= plan.maxReadings) {
      throw new Error("Daily reading limit exceeded");
    }

    // 4) スプレッド特定の制限チェック TODO:
    const spread = await spreadRepository.getSpreadById(params.spreadId);
    if (!spread) throw new Error("Spread not found");
    if (spread.code === "celtic_cross") {
      if (client.dailyCelticsCount >= plan.maxCeltics) {
        throw new Error("Daily Celtic cross limit exceeded");
      }
    }

    // 5) トランザクション内で複数操作
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return await prisma.$transaction(async (tx) => {
      // 占い結果保存
      const readingId = await readingRepository.createReading({
        clientId: params.clientId,
        deviceId: params.deviceId,
        tarotistId: params.tarotistId,
        spreadId: params.spreadId,
        categoryId: params.categoryId,
      });

      // 6) カードをランダム抽出
      const cards = await tarotRepository.getAllCards();
      if (!spread || !spread.cells) {
        throw new Error("Not enough cards to perform the spread");
      }
      await this.drawRandomCards(readingId, cards, spread);

      // ユーザーの利用状況更新
      await clientRepository.updateClient(params.clientId, {
        dailyReadingsCount: client.dailyReadingsCount + 1,
        lastReadingDate: new Date(),
        ...(spread?.code === "celtic_cross" && {
          dailyCelticsCount: client.dailyCelticsCount + 1,
          lastCelticReadingDate: new Date(),
        }),
      });

      // 完全な占い結果を返却
      const reading = await readingRepository.getReadingById(readingId);
      if (!reading) throw new Error("Reading not found");

      return reading;
    });
  }

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

  /**
   * 今日の残り回数取得
   */
  async getRemainingReadings(clientId: string): Promise<{
    remainingReadings: number;
    remainingCeltics: number;
    remainingPersonal: number;
  }> {
    const client = await clientRepository.getClientById(clientId);
    if (!client) throw new Error("Client not found");

    const plan = await planRepository.getPlanById(client.planId);
    if (!plan) throw new Error("Plan not found");

    const today = new Date().toISOString().split("T")[0];
    const lastReading = client.lastReadingDate?.toISOString().split("T")[0];

    // 日付が変わっていればリセット
    const dailyCount = lastReading === today ? client.dailyReadingsCount : 0;
    const celticCount = lastReading === today ? client.dailyCelticsCount : 0;
    const personalCount = lastReading === today ? client.dailyPersonalCount : 0;

    return {
      remainingReadings: Math.max(0, plan.maxReadings - dailyCount),
      remainingCeltics: Math.max(0, plan.maxCeltics - celticCount),
      remainingPersonal: Math.max(0, plan.maxPersonal - personalCount),
    };
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
