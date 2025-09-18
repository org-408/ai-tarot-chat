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

// プランの型
export type Plan = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  price: number;
  isActive: boolean;
  features: string[];
  maxReadings?: number | null;
  hasAICoach: boolean;
  createdAt: Date;
  updatedAt: Date;
  spreads?: Spread[];
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
};

// スプレッドとカテゴリの中間テーブル
export type SpreadToCategory = {
  id?: string;
  spreadId?: string;
  categoryId: string;
  spread?: Spread;
  category?: ReadingCategory;
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
  "id" | "createdAt" | "updatedAt" | "spreads"
>;
export type SpreadLevelInput = Omit<
  SpreadLevel,
  "id" | "createdAt" | "updatedAt" | "spreads"
>;
export type SpreadInput = Omit<
  Spread,
  "id" | "createdAt" | "updatedAt" | "cells" | "categories"
> & {
  cells: SpreadCellInput[];
  categoryIds: string[];
};
export type SpreadCellInput = Omit<SpreadCell, "id" | "spread">;
export type ReadingCategoryInput = Omit<
  ReadingCategory,
  "id" | "createdAt" | "updatedAt" | "spreads"
>;
