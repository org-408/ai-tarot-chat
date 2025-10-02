import type{
  Plan,
  ReadingCategory,
  Spread,
  SpreadLevel,
  Tarotist,
} from "../../../shared/lib/types";

export type UserPlan = "GUEST" | "FREE" | "STANDARD" | "PREMIUM";
export type PageType = "salon" | "reading" | "plans" | "history" | "settings";

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

export interface SpreadRecommendation {
  id: string;
  name: string;
  description: string;
  reason: string;
}

export interface SessionData {
  clientId: string;
  plan: UserPlan;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface MasterData {
  plans: Plan[];
  levels: SpreadLevel[];
  categories: ReadingCategory[];
  spreads?: Spread[];
  tarotists?: Tarotist[];
}
