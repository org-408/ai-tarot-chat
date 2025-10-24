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
      | "client"
      | "device"
      | "tarotist"
      | "spread"
      | "category"
      | "chatMessages"
    >
  ): Promise<string> {
    const created = await this.db.reading.create({
      data: {
        clientId: reading.clientId,
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
                order: card.order,
                position: card.position,
                description: card.description,
                isReversed: card.isReversed,
              })),
            }
          : undefined,
      },
    });

    return created.id;
  }

  async getReadingById(id: string): Promise<Reading | null> {
    return (await this.db.reading.findUnique({
      where: { id },
      include: {
        client: true,
        device: true,
        tarotist: true,
        spread: true,
        category: true,
        cards: true,
        chatMessages: true,
      },
    })) as unknown as Reading | null; // 型アサーションを追加
  }

  async getReadingsByClientId(
    clientId: string,
    limit = 20,
    offset = 0
  ): Promise<Reading[]> {
    return (await this.db.reading.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        client: true,
        device: true,
        tarotist: true,
        spread: true,
        category: true,
        cards: true,
        chatMessages: true,
      },
    })) as unknown as Reading[]; // 型アサーションを追加
  }

  async getReadingsByDeviceId(
    deviceId: string,
    limit = 20,
    offset = 0
  ): Promise<Reading[]> {
    return (await this.db.reading.findMany({
      where: { deviceId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        client: true,
        device: true,
        tarotist: true,
        spread: true,
        category: true,
        cards: true,
        chatMessages: true,
      },
    })) as unknown as Reading[]; // 型アサーションを追加
  }

  async getReadingsBySpreadId(spreadId: string): Promise<Reading[]> {
    return (await this.db.reading.findMany({
      where: { spreadId },
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        device: true,
        tarotist: true,
        spread: true,
        category: true,
        cards: true,
        chatMessages: true,
      },
    })) as unknown as Reading[]; // 型アサーションを追加
  }

  async getReadingsByCategoryId(categoryId: string): Promise<Reading[]> {
    return (await this.db.reading.findMany({
      where: { categoryId },
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        device: true,
        tarotist: true,
        spread: true,
        category: true,
        cards: true,
        chatMessages: true,
      },
    })) as unknown as Reading[]; // 型アサーションを追加
  }

  async deleteReading(id: string): Promise<void> {
    await this.db.reading.delete({
      where: { id },
    });
  }

  // ==================== DrawnCard ====================
  async createDrawnCard(
    drawnCard: Omit<DrawnCard, "id" | "createdAt" | "reading" | "card">
  ): Promise<string> {
    const created = await this.db.drawnCard.create({
      data: {
        readingId: drawnCard.readingId,
        cardId: drawnCard.cardId,
        x: drawnCard.x,
        y: drawnCard.y,
        order: drawnCard.order,
        position: drawnCard.position,
        description: drawnCard.description,
        isReversed: drawnCard.isReversed,
      },
    });

    return created.id;
  }

  async getDrawnCardsByReadingId(readingId: string): Promise<DrawnCard[]> {
    return (await this.db.drawnCard.findMany({
      where: { readingId },
      orderBy: { order: "asc" },
      include: { card: true },
    })) as unknown as DrawnCard[]; // 型アサーションを追加
  }

  async deleteDrawnCardsByReadingId(readingId: string): Promise<void> {
    await this.db.drawnCard.deleteMany({
      where: { readingId },
    });
  }
}

export const readingRepository = new ReadingRepository();
