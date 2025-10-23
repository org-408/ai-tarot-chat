import type {
  CardMeaning,
  TarotCard,
  TarotDeck,
  TarotDeckInput,
} from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class TarotRepository extends BaseRepository {
  // ==================== TarotDeck ====================
  async createDeck(deck: TarotDeckInput): Promise<TarotDeck> {
    const { cards, ...deckRest } = deck;
    const created = await this.db.tarotDeck.create({
      data: {
        ...deckRest,
        cards: {
          create: cards.map((card) => {
            const { meanings, ...cardRest } = card;
            return {
              ...cardRest,
              meanings: {
                create: meanings.map((meaning) => ({
                  ...meaning,
                })),
              },
            };
          }),
        },
      },
      include: { cards: { include: { meanings: true } } },
    });

    return created;
  }

  async getDeckById(id: string): Promise<TarotDeck | null> {
    return await this.db.tarotDeck.findUnique({
      where: { id },
      include: { cards: { include: { meanings: true } } },
    });
  }

  async getAllDecks(
    all: boolean = false,
    language: string = "ja"
  ): Promise<TarotDeck[]> {
    return await this.db.tarotDeck.findMany({
      where: all ? undefined : { language },
      orderBy: { createdAt: "desc" },
      include: { cards: { include: { meanings: true } } },
    });
  }

  async getActiveDeck(): Promise<TarotDeck | null> {
    return await this.db.tarotDeck.findFirst({
      where: { status: "active" },
      include: { cards: { include: { meanings: true } } },
    });
  }

  // ==================== TarotCard ====================
  async createCard(
    card: Omit<TarotCard, "id" | "createdAt" | "updatedAt" | "deck">
  ): Promise<TarotCard> {
    const { meanings, ...data } = card;
    const created = await this.db.tarotCard.create({
      data: {
        ...data,
        meanings: {
          create: meanings,
        },
      },
    });

    return created;
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

  async getAllCards(
    all: boolean = false,
    language: string = "ja"
  ): Promise<TarotCard[]> {
    return await this.db.tarotCard.findMany({
      where: all ? undefined : { language },
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
