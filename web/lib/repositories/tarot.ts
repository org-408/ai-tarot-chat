import type { CardMeaning, TarotCard, TarotDeck } from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class TarotRepository extends BaseRepository {
  // ==================== TarotDeck ====================
  async createDeck(
    deck: Omit<TarotDeck, "id" | "createdAt" | "updatedAt" | "cards">
  ): Promise<string> {
    const created = await this.db.tarotDeck.create({
      data: {
        name: deck.name,
        version: deck.version,
        purpose: deck.purpose,
        totalCards: deck.totalCards,
        sources: deck.sources,
        optimizedFor: deck.optimizedFor,
        primaryFocus: deck.primaryFocus,
        categories: deck.categories,
        status: deck.status,
      },
    });

    return created.id;
  }

  async getDeckById(id: string): Promise<TarotDeck | null> {
    return await this.db.tarotDeck.findUnique({
      where: { id },
      include: { cards: true },
    });
  }

  async getAllDecks(): Promise<TarotDeck[]> {
    return await this.db.tarotDeck.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async getActiveDeck(): Promise<TarotDeck | null> {
    return await this.db.tarotDeck.findFirst({
      where: { status: "active" },
      include: { cards: true },
    });
  }

  // ==================== TarotCard ====================
  async createCard(
    card: Omit<
      TarotCard,
      "id" | "createdAt" | "updatedAt" | "deck" | "meanings"
    >
  ): Promise<string> {
    const created = await this.db.tarotCard.create({
      data: {
        no: card.no,
        code: card.code,
        name: card.name,
        type: card.type,
        number: card.number,
        suit: card.suit,
        element: card.element,
        zodiac: card.zodiac,
        uprightKeywords: card.uprightKeywords,
        reversedKeywords: card.reversedKeywords,
        promptContext: card.promptContext,
        deckId: card.deckId,
      },
    });

    return created.id;
  }

  async getCardById(id: string): Promise<TarotCard | null> {
    return await this.db.tarotCard.findUnique({
      where: { id },
      include: { meanings: true },
    });
  }

  async getCardsByDeckId(deckId: string): Promise<TarotCard[]> {
    return await this.db.tarotCard.findMany({
      where: { deckId },
      orderBy: { no: "asc" },
      include: { meanings: true },
    });
  }

  async getAllCards(): Promise<TarotCard[]> {
    return await this.db.tarotCard.findMany({
      orderBy: { no: "asc" },
      include: { meanings: true },
    });
  }

  // ==================== CardMeaning ====================
  async createCardMeaning(
    meaning: Omit<CardMeaning, "id" | "createdAt" | "updatedAt" | "card">
  ): Promise<string> {
    const created = await this.db.cardMeaning.create({
      data: {
        category: meaning.category,
        upright: meaning.upright,
        reversed: meaning.reversed,
        cardId: meaning.cardId,
      },
    });

    return created.id;
  }

  async getMeaningsByCardId(cardId: string): Promise<CardMeaning[]> {
    return await this.db.cardMeaning.findMany({
      where: { cardId },
    });
  }

  async getMeaningByCardAndCategory(
    cardId: string,
    category: string
  ): Promise<CardMeaning | null> {
    return await this.db.cardMeaning.findFirst({
      where: {
        cardId,
        category,
      },
    });
  }
}

export const tarotRepository = new TarotRepository();
