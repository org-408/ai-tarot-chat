// ==========================================
// Auth.js 5.0 関連型定義
// ==========================================

import { ChatRole, ChatType } from "../../web/node_modules/@prisma/client";

export type Account = {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string | null;
  access_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: string | null;
  user?: User;
};

export type Session = {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  user?: User;
};

export type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: Date | null;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  accounts?: Account[];
  sessions?: Session[];
  clients?: Client[];
};

export type VerificationToken = {
  identifier: string;
  token: string;
  expires: Date;
};

// ==========================================
// ユーザー関連型定義
// ==========================================

// Device 型
export type Device = {
  id: string;
  deviceId: string;
  clientId?: string | null;
  client?: Client | null;

  platform?: string | null;
  appVersion?: string | null;
  osVersion?: string | null;
  pushToken?: string | null;

  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;

  readings?: Reading[];
  chatMessages?: ChatMessage[];
};

export type Client = {
  id: string;
  userId?: string | null;
  user?: User | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;

  // ソフトデリート
  deletedAt?: Date | null;

  // プラン情報
  planId: string;
  plan?: Plan;

  // 利用状況
  dailyReadingsCount: number;
  lastReadingDate?: Date | null;
  dailyCelticsCount: number;
  lastCelticReadingDate?: Date | null;
  dailyPersonalCount: number;
  lastPersonalReadingDate?: Date | null;

  // デバイス情報
  devices?: Device[];

  // ユーザー状態
  isRegistered: boolean;
  provider?: string | null; // "google", "apple" 何でサインインしたか
  lastLoginAt?: Date | null;

  // お気に入りスプレッド
  favoriteSpreads?: FavoriteSpread[];

  // 関連
  readings?: Reading[];
  planChangeHistories?: PlanChangeHistory[];
  chatMessages?: ChatMessage[];
};

export type DailyResetHistory = {
  id: string;
  clientId: string;
  client?: Client;
  date: Date;
  resetType: string; // "PLAN_CHANGE", "USAGE_CHECK" など

  beforeReadingsCount: number;
  beforeCelticsCount: number;
  beforePersonalCount: number;
  afterReadingsCount: number;
  afterCelticsCount: number;
  afterPersonalCount: number;

  createdAt: Date;
};

// ==========================================
// タロット関連型定義
// ==========================================

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

// ==========================================
// スプレッド関連型定義
// ==========================================

// スプレッドレベルの型
export type SpreadLevel = {
  id: string;
  code: string;
  name: string;
  description: string;
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
  cells?: SpreadCell[];
  categories?: SpreadToCategory[];
  reading?: Reading[];
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
  description: string;
  createdAt: Date;
  updatedAt: Date;
  spreads?: SpreadToCategory[];
  reading?: Reading[];
};

// スプレッドとカテゴリの中間テーブル
export type SpreadToCategory = {
  id?: string;
  spreadId: string;
  categoryId: string;
  spread?: Spread;
  category?: ReadingCategory;
};

// ==========================================
// プラン関連型定義
// ==========================================

// プランモデル
export type Plan = {
  id: string;
  no: number;
  code: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  features: string[];
  maxReadings: number;
  maxCeltics: number;
  maxPersonal: number;
  hasPersonal: boolean;
  hasHistory: boolean;
  createdAt: Date;
  updatedAt: Date;
  clients?: Client[];
  spreads?: Spread[];
  planChangeHistories?: PlanChangeHistory[];
};

// プラン履歴モデル
export type PlanChangeHistory = {
  id: string;
  clientId: string;
  client?: Client;
  fromPlanId: string;
  fromPlan?: Plan;
  toPlanId: string;
  toPlan?: Plan;
  reason?: string | null; // "UPGRADE", "DOWNGRADE", "EXPIRE", "CANCEL"など
  note?: string | null;
  changedAt: Date;
};

// タロット占い師モデル
export type Tarotist = {
  id: string;
  name: string;
  bio: string;
  avatarUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  readings?: Reading[];
  chatMessages?: ChatMessage[];
};

// リーディング履歴モデル
export type Reading = {
  id: string;
  clientId?: string | null;
  client?: Client | null;
  deviceId: string;
  device?: Device | null;
  tarotistId: string;
  tarotist?: Tarotist;
  spreadId: string;
  spread?: Spread;
  categoryId: string;
  category?: ReadingCategory;
  cards?: DrawnCard[];
  createdAt: Date;
  updatedAt: Date;

  chatMessages?: ChatMessage[];
};

// リーディングで引いたカードの型
export type DrawnCard = {
  id: string;
  readingId: string;
  reading?: Reading;
  cardId: string;
  card?: TarotCard;
  x: number;
  y: number;
  isReversed: boolean;
  order: number;
  createdAt: Date;
};

// チャットメッセージモデル - カード解釈・質問応答の履歴
export type ChatMessage = {
  id: string;
  clientId?: string | null;
  client?: Client | null;
  deviceId: string;
  device?: Device;
  tarotistId: string;
  tarotist?: Tarotist;
  chatType: ChatType;
  readingId: string;
  reading?: Reading;
  role: ChatRole; // "client" or "tarotist"
  message: string;
  createdAt: Date;
};

// お気に入りスプレッドモデル
export type FavoriteSpread = {
  id: string;
  clientId: string;
  client?: Client;
  spreadId: string;
  spread?: Spread;
  createdAt: Date;
};

// ==========================================
// 入力用の型（作成/更新時に使用）
// ==========================================

// Auth.js 5.0 関連
export type AccountInput = Omit<Account, "id" | "user">;
export type SessionInput = Omit<Session, "id" | "user">;
export type VerificationTokenInput = VerificationToken;

// ユーザー関連
export type ClientInput = Omit<
  Client,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "favoriteSpreads"
  | "reading"
  | "planChangeHistories"
>;

// タロット関連
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

// スプレッド関連
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
  | "reading"
  | "favoriteSpreads"
> & {
  cells: SpreadCellInput[];
  categoryIds: string[];
};
export type SpreadCellInput = Omit<SpreadCell, "id" | "spread">;
export type ReadingCategoryInput = Omit<
  ReadingCategory,
  "id" | "createdAt" | "updatedAt" | "spreads" | "reading"
>;

// プラン関連
export type PlanInput = Omit<
  Plan,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "clients"
  | "spreads"
  | "planChangeHistories"
>;
export type PlanChangeHistoryInput = Omit<
  PlanChangeHistory,
  "id" | "changedAt" | "client" | "Plan"
>;

// 履歴・お気に入り関連
export type TarotistInput = Omit<
  Tarotist,
  "id" | "createdAt" | "updatedAt" | "readings" | "chatMessages"
>;
export type ReadingInput = Omit<
  Reading,
  "id" | "createdAt" | "updatedAt" | "client" | "spread" | "category"
>;
export type DrawnCardInput = Omit<
  DrawnCard,
  "id" | "createdAt" | "reading" | "card"
>;
export type ChatMessageInput = Omit<
  ChatMessage,
  "id" | "createdAt" | "client" | "device" | "tarotist" | "reading"
>;
export type FavoriteSpreadInput = Omit<
  FavoriteSpread,
  "id" | "createdAt" | "client" | "spread"
>;

// ==========================================
// その他の型定義
// ==========================================

export interface JWTPayload {
  t: string; // "app"
  deviceId: string;
  clientId: string;
  planCode: string;
  // ↓↓ ユーザー認証後のみ ↓↓
  provider?: string; // "google", "apple", etc.
  user?: {
    id: string;
    email?: string;
    name?: string;
    image?: string;
  };
}

export interface TicketData {
  t: string; // "ticket"
  sub: string; // userId
  email: string;
  name?: string;
  image?: string;
  provider?: string;
}

export type UsageStats = {
  // totalReadings: number;
  // totalCeltics: number;
  // totalPersonal: number;
  // プラン
  planCode: string;
  // ユーザー登録
  isRegistered: boolean;
  // 最終ログイン日時
  lastLoginAt?: Date | null;
  // 日次リセット済みかどうか
  hasDailyReset: boolean;
  // 各占いの利用回数
  dailyReadingsCount: number;
  dailyCelticsCount: number;
  dailyPersonalCount: number;
  // 各占いの残利用回数
  remainingReadings: number;
  remainingCeltics: number;
  remainingPersonal: number;
  // 最終占い日
  lastReadingDate?: Date | null;
  lastCelticReadingDate?: Date | null;
  lastPersonalReadingDate?: Date | null;
};

export interface MasterData {
  plans: Plan[];
  levels: SpreadLevel[];
  categories: ReadingCategory[];
  spreads?: Spread[];
  decks?: TarotDeck[];
  tarotists?: Tarotist[];
}
