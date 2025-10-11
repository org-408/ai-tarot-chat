/**
 * SQLiteデータベースの行データ型定義
 */

// MasterConfig
export type MasterConfigRow = {
  id: string;
  key: string;
  version: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

// Plan
export type PlanRow = {
  id: string;
  no: number;
  code: string;
  name: string;
  description: string;
  price: number;
  requiresAuth: number; // SQLiteでは真偽値は0/1で表現
  features: string; // JSON文字列
  isActive: number; // SQLiteでは真偽値は0/1で表現
  maxReadings: number;
  maxCeltics: number;
  maxPersonal: number;
  hasPersonal: number; // SQLiteでは真偽値は0/1で表現
  hasHistory: number; // SQLiteでは真偽値は0/1で表現
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  createdAt: string;
  updatedAt: string;
};

// Tarotist
export type TarotistRow = {
  id: string;
  name: string;
  title: string;
  icon: string;
  trait: string;
  bio: string;
  provider: string;
  quality: string;
  order: number;
  planId: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  avatarUrl: string | null;
  cost: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// TarotDeck
export type TarotDeckRow = {
  id: string;
  name: string;
  version: string;
  purpose: string;
  totalCards: number;
  sources: string; // JSON文字列
  optimizedFor: string;
  primaryFocus: string;
  categories: string; // JSON文字列
  status: string;
  language: string;
  createdAt: string;
  updatedAt: string;
};

// TarotCard
export type TarotCardRow = {
  id: string;
  no: number;
  code: string;
  name: string;
  type: string;
  number: number;
  suit: string | null;
  element: string | null;
  zodiac: string | null;
  uprightKeywords: string; // JSON文字列
  reversedKeywords: string; // JSON文字列
  promptContext: string;
  language: string;
  deckId: string;
  createdAt: string;
  updatedAt: string;
};

// CardMeaning
export type CardMeaningRow = {
  id: string;
  category: string;
  upright: string;
  reversed: string;
  cardId: string;
  language: string;
  createdAt: string;
  updatedAt: string;
};

// SpreadLevel
export type SpreadLevelRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

// Spread
export type SpreadRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  guide: string;
  planId: string;
  levelId: string;
  createdAt: string;
  updatedAt: string;
};

// SpreadCell
export type SpreadCellRow = {
  id: string;
  spreadId: string;
  x: number;
  y: number;
  vLabel: string;
  hLabel: string;
  vOrder: number;
  hOrder: number;
};

// ReadingCategory
export type ReadingCategoryRow = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

// SpreadToCategory
export type SpreadToCategoryRow = {
  id: string;
  spreadId: string;
  categoryId: string;
};
