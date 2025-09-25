import type { CardMeaning, TarotCard, TarotDeck } from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class TarotRepository extends BaseRepository {
  // ==================== TarotDeck ====================
  async createDeck(
    deck: Omit<TarotDeck, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO tarot_decks (
        id, name, version, purpose, total_cards, sources,
        optimized_for, primary_focus, categories, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        deck.name,
        deck.version,
        deck.purpose,
        deck.totalCards,
        this.stringifyJSON(deck.sources),
        deck.optimizedFor,
        deck.primaryFocus,
        this.stringifyJSON(deck.categories),
        deck.status,
        now,
        now,
      ]
    );

    return id;
  }

  async getDeckById(id: string): Promise<TarotDeck | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM tarot_decks WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToDeck(rows[0]);
  }

  async getAllDecks(): Promise<TarotDeck[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM tarot_decks ORDER BY created_at DESC`
    );

    return rows.map((row) => this.mapRowToDeck(row));
  }

  async getActiveDeck(): Promise<TarotDeck | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM tarot_decks WHERE status = 'active' LIMIT 1`
    );

    if (rows.length === 0) return null;
    return this.mapRowToDeck(rows[0]);
  }

  private mapRowToDeck(row: any): TarotDeck {
    return {
      id: row.id,
      name: row.name,
      version: row.version,
      purpose: row.purpose,
      totalCards: row.total_cards,
      sources: this.parseJSON<string[]>(row.sources),
      optimizedFor: row.optimized_for,
      primaryFocus: row.primary_focus,
      categories: this.parseJSON<string[]>(row.categories),
      status: row.status,
      createdAt: this.fromTimestamp(row.created_at),
      updatedAt: this.fromTimestamp(row.updated_at),
    };
  }

  // ==================== TarotCard ====================
  async createCard(
    card: Omit<TarotCard, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO tarot_cards (
        id, no, code, name, type, number, suit, element, zodiac,
        upright_keywords, reversed_keywords, prompt_context, deck_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        card.no,
        card.code,
        card.name,
        card.type,
        card.number,
        card.suit ?? null,
        card.element ?? null,
        card.zodiac ?? null,
        this.stringifyJSON(card.uprightKeywords),
        this.stringifyJSON(card.reversedKeywords),
        card.promptContext,
        card.deckId,
        now,
        now,
      ]
    );

    return id;
  }

  async getCardById(id: string): Promise<TarotCard | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM tarot_cards WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToCard(rows[0]);
  }

  async getCardsByDeckId(deckId: string): Promise<TarotCard[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM tarot_cards WHERE deck_id = ? ORDER BY no ASC`,
      [deckId]
    );

    return rows.map((row) => this.mapRowToCard(row));
  }

  async getAllCards(): Promise<TarotCard[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM tarot_cards ORDER BY no ASC`
    );

    return rows.map((row) => this.mapRowToCard(row));
  }

  private mapRowToCard(row: any): TarotCard {
    return {
      id: row.id,
      no: row.no,
      code: row.code,
      name: row.name,
      type: row.type,
      number: row.number,
      suit: row.suit,
      element: row.element,
      zodiac: row.zodiac,
      uprightKeywords: this.parseJSON<string[]>(row.upright_keywords),
      reversedKeywords: this.parseJSON<string[]>(row.reversed_keywords),
      promptContext: row.prompt_context,
      deckId: row.deck_id,
      createdAt: this.fromTimestamp(row.created_at),
      updatedAt: this.fromTimestamp(row.updated_at),
    };
  }

  // ==================== CardMeaning ====================
  async createCardMeaning(
    meaning: Omit<CardMeaning, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO card_meanings (
        id, category, upright, reversed, card_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        meaning.category,
        meaning.upright,
        meaning.reversed,
        meaning.cardId,
        now,
        now,
      ]
    );

    return id;
  }

  async getMeaningsByCardId(cardId: string): Promise<CardMeaning[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM card_meanings WHERE card_id = ?`,
      [cardId]
    );

    return rows.map((row) => this.mapRowToCardMeaning(row));
  }

  async getMeaningByCardAndCategory(
    cardId: string,
    category: string
  ): Promise<CardMeaning | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM card_meanings WHERE card_id = ? AND category = ?`,
      [cardId, category]
    );

    if (rows.length === 0) return null;
    return this.mapRowToCardMeaning(rows[0]);
  }

  private mapRowToCardMeaning(row: any): CardMeaning {
    return {
      id: row.id,
      category: row.category,
      upright: row.upright,
      reversed: row.reversed,
      cardId: row.card_id,
      createdAt: this.fromTimestamp(row.created_at),
      updatedAt: this.fromTimestamp(row.updated_at),
    };
  }
}

export const tarotRepository = new TarotRepository();
