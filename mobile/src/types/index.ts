export type UserPlan = "GUEST" | "FREE" | "STANDARD" | "PREMIUM";
export type PageType = "salon" | "reading" | "plans" | "history" | "settings";

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
