// タロットデッキの型
export type TarotDeck = {
  id: string;
  name: string;
  version: string;
  purpose: string;
  totalCards: number;
  sources: string[];
  optimizedFor: string;
  primaryFocus: string;
  categories: string[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
  cards?: TarotCard[];
};

// タロットカードの型
export type TarotCard = {
  id: string;
  no: number;
  code: string;
  name: string;
  type: string; // major, minor
  number: number;
  suit?: string | null;
  element?: string | null;
  zodiac?: string | null;
  uprightKeywords: string[];
  reversedKeywords: string[];
  promptContext: string;
  deckId: string;
  deck?: TarotDeck;
  meanings?: CardMeaning[];
  createdAt: Date;
  updatedAt: Date;
};

// カードの意味の型
export type CardMeaning = {
  id: string;
  category: string; // love, career, money, health
  upright: string;
  reversed: string;
  cardId: string;
  card?: TarotCard;
  createdAt: Date;
  updatedAt: Date;
};

// スプレッドレベルの型
export type SpreadLevel = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  spreads?: Spread[];
};

// スプレッドの型
export type Spread = {
  id: string;
  code: string;
  name: string;
  category: string;
  levelId: string;
  level?: SpreadLevel;
  planId: string;
  plan?: Plan;
  guide?: string | null;
  createdAt: Date;
  updatedAt: Date;
  cells: SpreadCell[];
  categories: SpreadToCategory[];
  readingHistories?: ReadingHistory[];
  favoriteSpreads?: FavoriteSpread[];
};

// スプレッドセルの型
export type SpreadCell = {
  id?: string;
  x: number;
  y: number;
  vLabel?: string | null;
  hLabel?: string | null;
  vOrder?: number | null;
  hOrder?: number | null;
  spreadId: string;
  spread?: Spread;
};

// カテゴリモデル
export type ReadingCategory = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  spreads?: SpreadToCategory[];
  readingHistories?: ReadingHistory[];
};

// スプレッドとカテゴリの中間テーブル
export type SpreadToCategory = {
  id?: string;
  spreadId: string;
  categoryId: string;
  spread?: Spread;
  category?: ReadingCategory;
};

// プランモデル
export type Plan = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  price: number;
  isActive: boolean;
  features: string[];
  maxReadings?: number | null;
  maxCeltics?: number | null;
  maxPersonal?: number | null;
  hasPersonal: boolean;
  hasHistory: boolean;
  createdAt: Date;
  updatedAt: Date;
  users?: User[];
  spreads?: Spread[];
  planChangeHistories?: PlanChangeHistory[];
};

// ユーザーモデル
export type User = {
  id: string;
  email?: string | null;
  createdAt: Date;
  updatedAt: Date;
  name?: string | null;
  image?: string | null;
  googleId?: string | null;
  planId: string;
  plan?: Plan;
  dailyReadingsCount: number;
  lastReadingDate?: Date | null;
  dailyCelticsCount: number;
  lastCelticReadingDate?: Date | null;
  dailyPersonalCount: number;
  lastPersonalReadingDate?: Date | null;
  deviceId?: string | null;
  isRegistered: boolean;
  lastLoginAt?: Date | null;
  favoriteSpreads?: FavoriteSpread[];
  readingHistories?: ReadingHistory[];
  planChangeHistories?: PlanChangeHistory[];
};

// プラン履歴モデル
export type PlanChangeHistory = {
  id: string;
  userId: string;
  user?: User;
  planId: string;
  Plan?: Plan;
  changedAt: Date;
};

// リーディング履歴モデル
export type ReadingHistory = {
  id: string;
  userId: string;
  user?: User;
  spreadId: string;
  spread?: Spread;
  categoryId: string;
  category?: ReadingCategory;
  cards: string[];
  cardsReversed: boolean[];
  cardReadings: string[];
  finalReading: string;
  cardOccurs: string[];
  cardReReadings: string[];
  userQuestions: string[];
  aiResponses: string[];
  createdAt: Date;
  updatedAt: Date;
};

// お気に入りスプレッドモデル
export type FavoriteSpread = {
  id: string;
  userId: string;
  user?: User;
  spreadId: string;
  spread?: Spread;
  createdAt: Date;
};

// 入力用の型（作成/更新時に使用）
export type TarotDeckInput = Omit<
  TarotDeck,
  "id" | "createdAt" | "updatedAt" | "cards"
>;
export type TarotCardInput = Omit<
  TarotCard,
  "id" | "createdAt" | "updatedAt" | "deck" | "meanings"
>;
export type CardMeaningInput = Omit<
  CardMeaning,
  "id" | "createdAt" | "updatedAt" | "card"
>;
export type PlanInput = Omit<
  Plan,
  "id" | "createdAt" | "updatedAt" | "users" | "spreads" | "planChangeHistories"
>;
export type SpreadLevelInput = Omit<
  SpreadLevel,
  "id" | "createdAt" | "updatedAt" | "spreads"
>;
export type SpreadInput = Omit<
  Spread,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "cells"
  | "categories"
  | "readingHistories"
  | "favoriteSpreads"
> & {
  cells: SpreadCellInput[];
  categoryIds: string[];
};
export type SpreadCellInput = Omit<SpreadCell, "id" | "spread">;
export type ReadingCategoryInput = Omit<
  ReadingCategory,
  "id" | "createdAt" | "updatedAt" | "spreads" | "readingHistories"
>;
export type UserInput = Omit<
  User,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "favoriteSpreads"
  | "readingHistories"
  | "planChangeHistories"
>;
export type PlanChangeHistoryInput = Omit<
  PlanChangeHistory,
  "id" | "changedAt" | "user" | "Plan"
>;
export type ReadingHistoryInput = Omit<
  ReadingHistory,
  "id" | "createdAt" | "updatedAt" | "user" | "spread" | "category"
>;
export type FavoriteSpreadInput = Omit<
  FavoriteSpread,
  "id" | "createdAt" | "user" | "spread"
>;
