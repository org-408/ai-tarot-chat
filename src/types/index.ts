export type UserPlan = "Free" | "Standard" | "Premium";
export type PageType = "reading" | "plans" | "history" | "settings";

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  plan_type: string;
  is_registered: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface PlanFeatures {
  daily_limit: number | null;
  available_spreads: number[];
  ai_chat: boolean;
  ads: boolean;
  plan_name: string;
  free_count: number;
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

export interface Spread {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface SpreadRecommendation {
  id: string;
  name: string;
  description: string;
  reason: string;
}
