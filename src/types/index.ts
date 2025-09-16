// 共通型定義ファイル

export type UserPlan = "Free" | "Standard" | "Coaching";

export type PageType = "reading" | "plans" | "history" | "settings";

export interface PlanFeatures {
  daily_limit: number | null;
  available_spreads: number[];
  ai_chat: boolean;
  ads: boolean;
  plan_name: string;
  free_count: number;
}

export interface SpreadRecommendation {
  id: string;
  name: string;
  description: string;
  reason: string;
}

export interface Spread {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface Genre {
  id: string;
  name: string;
  description: string;
}

export interface NavigationItem {
  id: PageType;
  label: string;
  icon: string;
  available: boolean;
}
