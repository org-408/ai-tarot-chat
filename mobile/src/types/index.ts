import type { UIMessage } from "ai";
import type { DrawnCard, TarotCard } from "../../../shared/lib/types";

export type UserPlan = "GUEST" | "FREE" | "STANDARD" | "PREMIUM";
export type PageType =
  | "salon"
  | "reading"
  | "plans"
  | "tarotist"
  | "tarotistSwipe"
  | "history"
  | "settings";

export interface NavigationItem {
  id: PageType;
  label: string;
  icon: string;
  available: boolean;
}

export interface SpreadRecommendation {
  id: string;
  name: string;
  description: string;
  reason: string;
}

export type ReadingRequest = {
  messages: UIMessage[];
  spreadId: string;
  categoryId?: string; // categoryId または userInput のどちらかが必須
  userInput?: string;
  drawnCards: DrawnCard[];
  provider?: "gemini" | "groq" | "claude" | "moonshot" | "mistral" | "jamba";
};

// カード配置情報の型
export interface CardPlacement {
  id: string;
  number: number;
  gridX: number;
  gridY: number;
  rotation: number;
  card: TarotCard;
  isReversed: boolean;
  position: string;
  description: string;
}
