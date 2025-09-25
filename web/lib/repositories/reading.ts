import type { DrawnCard, Reading } from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class ReadingRepository extends BaseRepository {
  // ==================== Reading ====================
  async createReading(
    reading: Omit<
      Reading,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "user"
      | "device"
      | "tarotist"
      | "spread"
      | "category"
      | "chatMessages"
    >
  ): Promise<string> {
    const created = await this.db.reading.create({
      data: {
        userId: reading.userId,
        deviceId: reading.deviceId,
        tarotistId: reading.tarotistId,
        spreadId: reading.spreadId,
        categoryId: reading.categoryId,
        cards: Array.isArray(reading.cards)
          ? {
              create: reading.cards.map((card) => ({
                // DrawnCardの必要なフィールドを指定
                cardId: card.cardId,
                x: card.x,
                y: card.y,
                isReversed: card.isReversed,
                order: card.order,
              })),
            }
          : undefined,
      },
    });

    return created.id;
  }

  async getReadingById(id: string): Promise<Reading | null> {
    return await this.db.reading.findUnique({
      where: { id },
      include: {
        user: true,
        device: true,
        tarotist: true,
        spread: true,
        category: true,
        cards: { include: { card: true } },
      },
    });
  }

  async getReadingsByUserId(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<Reading[]> {
    return await this.db.reading.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        spread: true,
        category: true,
      },
    });
  }

  async getReadingsByDeviceId(
    deviceId: string,
    limit = 20,
    offset = 0
  ): Promise<Reading[]> {
    return await this.db.reading.findMany({
      where: { deviceId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        spread: true,
        category: true,
      },
    });
  }

  async getReadingsBySpreadId(spreadId: string): Promise<Reading[]> {
    return await this.db.reading.findMany({
      where: { spreadId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getReadingsByCategoryId(categoryId: string): Promise<Reading[]> {
    return await this.db.reading.findMany({
      where: { categoryId },
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteReading(id: string): Promise<void> {
    await this.db.reading.delete({
      where: { id },
    });
  }

  // ==================== DrawCard ====================
  async createDrawCard(
    drawnCard: Omit<DrawnCard, "id" | "createdAt" | "reading" | "card">
  ): Promise<string> {
    const created = await this.db.drawnCard.create({
      data: {
        readingId: drawnCard.readingId,
        cardId: drawnCard.cardId,
        x: drawnCard.x,
        y: drawnCard.y,
        isReversed: drawnCard.isReversed,
        order: drawnCard.order,
      },
    });

    return created.id;
  }

  async getDrawCardsByReadingId(readingId: string): Promise<DrawnCard[]> {
    return await this.db.drawnCard.findMany({
      where: { readingId },
      orderBy: { order: "asc" },
      include: { card: true },
    });
  }

  async deleteDrawCardsByReadingId(readingId: string): Promise<void> {
    await this.db.drawnCard.deleteMany({
      where: { readingId },
    });
  }
}

export const readingRepository = new ReadingRepository();
