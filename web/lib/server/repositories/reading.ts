import type {
  DrawnCard,
  Reading,
  ReadingInput,
} from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class ReadingRepository extends BaseRepository {
  private async resolveReadingRelations(reading: ReadingInput) {
    const tarotist = await this.db.tarotist.findUnique({
      where: { name: reading.tarotist!.name },
    });
    if (!tarotist) {
      throw new Error("Invalid tarotist name: " + reading.tarotist?.name);
    }

    const spread = await this.db.spread.findUnique({
      where: { code: reading.spread!.code },
    });
    if (!spread) {
      throw new Error("Invalid spread code: " + reading.spread?.code);
    }

    const category = reading.category
      ? await this.db.readingCategory.findUnique({
          where: { no: reading.category.no },
        })
      : null;

    return { tarotist, spread, category };
  }

  // ==================== Reading ====================

  async createReading(reading: ReadingInput): Promise<Reading> {
    const { tarotist, spread, category } =
      await this.resolveReadingRelations(reading);

    const created = await this.db.reading.create({
      data: {
        clientId: reading.clientId!,
        deviceId: reading.deviceId!,
        tarotistId: tarotist.id,
        spreadId: spread.id,
        categoryId: category?.id ?? null,
        customQuestion: reading.customQuestion,
        cards: Array.isArray(reading.cards)
          ? {
              create: reading.cards.map((card) => ({
                cardId: card.cardId,
                x: card.x,
                y: card.y,
                order: card.order,
                position: card.position,
                description: card.description,
                isReversed: card.isReversed,
                isHorizontal: card.isHorizontal ?? false,
                keywords: card.keywords ?? [],
              })),
            }
          : undefined,
        chatMessages: {
          create: reading.chatMessages.map((message) => ({
            clientId: reading.clientId,
            deviceId: reading.deviceId,
            tarotistId: tarotist.id,
            chatType: message.chatType,
            role: message.role,
            message: message.message,
          })),
        },
      },
      include: {
        client: true,
        tarotist: true,
        spread: true,
        category: true,
        cards: { include: { card: true } },
        chatMessages: true,
      },
    });

    return created as unknown as Reading; // 型アサーションを追加s
  }

  async updateReading(id: string, reading: ReadingInput): Promise<Reading> {
    const { tarotist, spread, category } =
      await this.resolveReadingRelations(reading);

    const updated = await this.db.reading.update({
      where: { id },
      data: {
        tarotistId: tarotist.id,
        spreadId: spread.id,
        categoryId: category?.id ?? null,
        customQuestion: reading.customQuestion,
        cards: {
          deleteMany: {},
          create: Array.isArray(reading.cards)
            ? reading.cards.map((card) => ({
                cardId: card.cardId,
                x: card.x,
                y: card.y,
                order: card.order,
                position: card.position,
                description: card.description,
                isReversed: card.isReversed,
                isHorizontal: card.isHorizontal ?? false,
                keywords: card.keywords ?? [],
              }))
            : [],
        },
        chatMessages: {
          deleteMany: {},
          create: reading.chatMessages.map((message) => ({
            clientId: reading.clientId,
            deviceId: reading.deviceId,
            tarotistId: tarotist.id,
            chatType: message.chatType,
            role: message.role,
            message: message.message,
          })),
        },
      },
      include: {
        client: true,
        device: true,
        tarotist: true,
        spread: true,
        category: true,
        cards: { include: { card: true } },
        chatMessages: true,
      },
    });

    return updated as unknown as Reading;
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
        cards: { include: { card: true } },
        chatMessages: true,
      },
    })) as unknown as Reading | null; // 型アサーションを追加
  }

  async getLatestPersonalReadingForClient(clientId: string): Promise<Reading | null> {
    return (await this.db.reading.findFirst({
      where: { clientId, customQuestion: { not: null } },
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        device: true,
        tarotist: true,
        spread: true,
        category: true,
        cards: { include: { card: true } },
        chatMessages: true,
      },
    })) as unknown as Reading | null;
  }

  async countByClientId(clientId: string): Promise<number> {
    return this.db.reading.count({ where: { clientId } });
  }

  async getReadingsByClientId(
    clientId: string,
    take = 20,
    skip = 0
  ): Promise<Reading[]> {
    return (await this.db.reading.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        client: true,
        device: true,
        tarotist: true,
        spread: true,
        category: true,
        cards: { include: { card: true } },
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
        cards: { include: { card: true } },
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
        cards: { include: { card: true } },
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
        cards: { include: { card: true } },
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
