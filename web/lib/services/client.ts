import type { Spread, TarotCard, UsageStats } from "@/../shared/lib/types";
import { clientRepository } from "@/lib/repositories/client";
import { prisma } from "@/lib/repositories/database";
import { isSameDayJST } from "../utils/date";

export class ClientService {
  /**
   * 今日の残り回数取得
   */
  async getUsageAndReset(
    clientId: string,
    resetType: string = "USAGE_CHECK"
  ): Promise<UsageStats> {
    return await prisma.$transaction(async (tx) => {
      const clientRepo = clientRepository.withTransaction(tx);

      let client = await clientRepo.getClientById(clientId);
      if (!client) throw new Error("Client not found");
      console.log("Fetched client:", client);

      const plan = client.plan;
      if (!plan) throw new Error("Plan not found");
      const planCode = plan.code;
      console.log("Client plan:", plan);

      // 日付確認
      console.log("Client last reading date:", client.lastReadingDate);
      console.log(
        "Client last celtic reading date:",
        client.lastCelticReadingDate
      );
      console.log(
        "Client last personal reading date:",
        client.lastPersonalReadingDate
      );
      const needsReset =
        [
          client.lastReadingDate,
          client.lastCelticReadingDate,
          client.lastPersonalReadingDate,
        ].filter((date) => !isSameDayJST(date || undefined)).length > 0 &&
        [
          client.lastReadingDate,
          client.lastCelticReadingDate,
          client.lastPersonalReadingDate,
        ].some((date) => date !== null);

      // 日付が変わっていればリセット
      if (needsReset) {
        console.log("Resetting daily counts for client:", client.id);
        // beforeリセット用に保存
        const beforeReadingsCount = client.dailyReadingsCount;
        const beforeCelticsCount = client.dailyCelticsCount;
        const beforePersonalCount = client.dailyPersonalCount;
        console.log(
          "Before counts - Readings:",
          beforeReadingsCount,
          "Celtics:",
          beforeCelticsCount,
          "Personal:",
          beforePersonalCount
        );

        // clientのカウントリセット
        client = await clientRepo.resetDailyCounts(client.id);
        // reset履歴追加
        await clientRepo.createDailyResetHistory({
          client: { connect: { id: client.id } },
          date: new Date(),
          resetType,
          beforeReadingsCount,
          beforeCelticsCount,
          beforePersonalCount,
          afterCelticsCount: 0,
          afterPersonalCount: 0,
          afterReadingsCount: 0,
        });
        console.log("Daily counts reset completed for client:", client.id);
      }

      console.log("dailyReadingsCount:", client.dailyReadingsCount);
      console.log("dailyCelticsCount:", client.dailyCelticsCount);
      console.log("dailyPersonalCount:", client.dailyPersonalCount);

      // UsageStats組み立て
      return {
        planCode,
        isRegistered: client.isRegistered,
        lastLoginAt: client.lastLoginAt,
        hasDailyReset: needsReset,
        dailyReadingsCount: client.dailyReadingsCount,
        dailyCelticsCount: client.dailyCelticsCount,
        dailyPersonalCount: client.dailyPersonalCount,
        remainingReadings: Math.max(
          0,
          plan.maxReadings - client.dailyReadingsCount
        ),
        remainingCeltics: Math.max(
          0,
          plan.maxCeltics - client.dailyCelticsCount
        ),
        remainingPersonal: Math.max(
          0,
          plan.maxPersonal - client.dailyPersonalCount
        ),
        lastReadingDate: client.lastReadingDate,
        lastCelticReadingDate: client.lastCelticReadingDate,
        lastPersonalReadingDate: client.lastPersonalReadingDate,
      };
    });
  }

  async getClientById(clientId: string) {
    return clientRepository.getClientById(clientId);
  }

  async getClientByUserId(userId: string) {
    return clientRepository.getClientByUserId(userId);
  }

  async updateLoginDate(clientId: string): Promise<void> {
    await clientRepository.updateClient(clientId, {
      lastLoginAt: new Date(),
    });
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

export const clientService = new ClientService();
