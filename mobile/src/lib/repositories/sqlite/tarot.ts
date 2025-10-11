/**
 * Tarot Repository (SQLite版)
 *
 * Prisma版のTarotRepositoryをSQLite用に移植
 */

import { v4 as uuidv4 } from "uuid";
import type {
  CardMeaning,
  TarotCard,
  TarotDeck,
} from "../../../../../shared/lib/types";
import type {
  CardMeaningRow,
  TarotCardRow,
  TarotDeckRow,
} from "../../database/types";
import { BaseRepository } from "./base";

export class TarotRepository extends BaseRepository {
  // ==================== TarotDeck ====================

  async createDeck(
    deck: Omit<TarotDeck, "id" | "createdAt" | "updatedAt" | "cards">
  ): Promise<string> {
    const db = await this.getDb();
    const id = uuidv4();
    const now = this.dateToString(new Date());

    await db.run(
      `INSERT INTO tarot_decks 
      (id, name, version, purpose, totalCards, sources, optimizedFor, primaryFocus, 
       categories, status, language, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        deck.language,
        now,
        now,
      ]
    );

    return id;
  }

  async getDeckById(id: string): Promise<TarotDeck | null> {
    const db = await this.getDb();
    const result = await db.query("SELECT * FROM tarot_decks WHERE id = ?", [
      id,
    ]);

    if (!result.values || result.values.length === 0) return null;

    const deck = this.mapRowToDeck(result.values[0]);

    // カードも取得
    deck.cards = await this.getCardsByDeckId(id);

    return deck;
  }

  async getAllDecks(
    all: boolean = false,
    language: string = "ja"
  ): Promise<TarotDeck[]> {
    const db = await this.getDb();
    const query = all
      ? "SELECT * FROM tarot_decks ORDER BY createdAt DESC"
      : "SELECT * FROM tarot_decks WHERE language = ? ORDER BY createdAt DESC";

    const result = all
      ? await db.query(query)
      : await db.query(query, [language]);

    if (!result.values) return [];

    const decks: TarotDeck[] = [];
    for (const row of result.values) {
      const deck = this.mapRowToDeck(row);
      deck.cards = await this.getCardsByDeckId(deck.id);
      decks.push(deck);
    }

    return decks;
  }

  async getActiveDeck(): Promise<TarotDeck | null> {
    const db = await this.getDb();
    const result = await db.query(
      "SELECT * FROM tarot_decks WHERE status = ? LIMIT 1",
      ["active"]
    );

    if (!result.values || result.values.length === 0) return null;

    const deck = this.mapRowToDeck(result.values[0]);
    deck.cards = await this.getCardsByDeckId(deck.id);

    return deck;
  }

  // ==================== TarotCard ====================

  async createCard(
    card: Omit<
      TarotCard,
      "id" | "createdAt" | "updatedAt" | "deck" | "meanings"
    >
  ): Promise<string> {
    const db = await this.getDb();
    const id = uuidv4();
    const now = this.dateToString(new Date());

    await db.run(
      `INSERT INTO tarot_cards 
      (id, no, code, name, type, number, suit, element, zodiac, 
       uprightKeywords, reversedKeywords, promptContext, language, deckId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        card.no,
        card.code,
        card.name,
        card.type,
        card.number,
        card.suit,
        card.element,
        card.zodiac,
        this.stringifyJSON(card.uprightKeywords),
        this.stringifyJSON(card.reversedKeywords),
        card.promptContext,
        card.language,
        card.deckId,
        now,
        now,
      ]
    );

    return id;
  }

  async getCardById(id: string): Promise<TarotCard | null> {
    const db = await this.getDb();
    const result = await db.query("SELECT * FROM tarot_cards WHERE id = ?", [
      id,
    ]);

    if (!result.values || result.values.length === 0) return null;

    const card = this.mapRowToCard(result.values[0]);
    card.meanings = await this.getMeaningsByCardId(id);

    return card;
  }

  async getCardsByDeckId(deckId: string): Promise<TarotCard[]> {
    const db = await this.getDb();
    const result = await db.query(
      "SELECT * FROM tarot_cards WHERE deckId = ? ORDER BY no",
      [deckId]
    );

    if (!result.values) return [];

    const cards: TarotCard[] = [];
    for (const row of result.values) {
      const card = this.mapRowToCard(row);
      card.meanings = await this.getMeaningsByCardId(card.id);
      cards.push(card);
    }

    return cards;
  }

  async getAllCards(): Promise<TarotCard[]> {
    const db = await this.getDb();
    const result = await db.query("SELECT * FROM tarot_cards ORDER BY no");

    if (!result.values) return [];

    const cards: TarotCard[] = [];
    for (const row of result.values) {
      const card = this.mapRowToCard(row);
      card.meanings = await this.getMeaningsByCardId(card.id);
      cards.push(card);
    }

    return cards;
  }

  // ==================== CardMeaning ====================

  async createCardMeaning(
    meaning: Omit<CardMeaning, "id" | "createdAt" | "updatedAt" | "card">
  ): Promise<string> {
    const db = await this.getDb();
    const id = uuidv4();
    const now = this.dateToString(new Date());

    await db.run(
      `INSERT INTO card_meanings 
      (id, category, upright, reversed, cardId, language, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        meaning.category,
        meaning.upright,
        meaning.reversed,
        meaning.cardId,
        meaning.language,
        now,
        now,
      ]
    );

    return id;
  }

  async getMeaningsByCardId(cardId: string): Promise<CardMeaning[]> {
    const db = await this.getDb();
    const result = await db.query(
      "SELECT * FROM card_meanings WHERE cardId = ?",
      [cardId]
    );

    if (!result.values) return [];

    return result.values.map((row) => this.mapRowToMeaning(row));
  }

  async getMeaningByCardAndCategory(
    cardId: string,
    category: string
  ): Promise<CardMeaning | null> {
    const db = await this.getDb();
    const result = await db.query(
      "SELECT * FROM card_meanings WHERE cardId = ? AND category = ? LIMIT 1",
      [cardId, category]
    );

    if (!result.values || result.values.length === 0) return null;

    return this.mapRowToMeaning(result.values[0]);
  }

  // ==================== Helper ====================

  private mapRowToDeck(row: TarotDeckRow): TarotDeck {
    return {
      id: row.id,
      name: row.name,
      version: row.version,
      purpose: row.purpose,
      totalCards: row.totalCards,
      sources: this.parseJSON(row.sources),
      optimizedFor: row.optimizedFor,
      primaryFocus: row.primaryFocus,
      categories: this.parseJSON(row.categories),
      status: row.status,
      language: row.language,
      createdAt: this.stringToDate(row.createdAt),
      updatedAt: this.stringToDate(row.updatedAt),
      cards: [], // 後で取得
    };
  }

  private mapRowToCard(row: TarotCardRow): TarotCard {
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
      uprightKeywords: this.parseJSON(row.uprightKeywords),
      reversedKeywords: this.parseJSON(row.reversedKeywords),
      promptContext: row.promptContext,
      language: row.language,
      deckId: row.deckId,
      createdAt: this.stringToDate(row.createdAt),
      updatedAt: this.stringToDate(row.updatedAt),
      meanings: [], // 後で取得
    };
  }

  private mapRowToMeaning(row: CardMeaningRow): CardMeaning {
    return {
      id: row.id,
      category: row.category,
      upright: row.upright,
      reversed: row.reversed,
      cardId: row.cardId,
      language: row.language,
      createdAt: this.stringToDate(row.createdAt),
      updatedAt: this.stringToDate(row.updatedAt),
    };
  }
}

export const tarotRepository = new TarotRepository();
