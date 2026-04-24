/**
 * Phase 2.1 — Plan の英語翻訳。
 * キー: Plan.code ("GUEST" / "FREE" / "STANDARD" / "PREMIUM")
 *
 * Apple 4.3(b) 対応: "fortune" / "predict" / "horoscope" / "destiny" /
 * "fate" / "zodiac" を含まない語彙に統一。「占い」→ "tarot reading"。
 */

export type PlanEn = {
  name: string;
  description: string;
  features: string[];
};

export const PLAN_EN: Record<string, PlanEn> = {
  GUEST: {
    name: "Guest",
    description: "Try a simple tarot reading for free.",
    features: [
      "No sign-up required",
      "One reading per day",
      "Three basic spreads",
      "Love, Work, and Today's guidance",
      "Ads shown",
    ],
  },
  FREE: {
    name: "Free",
    description: "A few more readings per day, with history saved.",
    features: [
      "Sign up to unlock more features",
      "Up to three readings per day",
      "Reading history saved",
      "Three basic spreads",
      "Love, Work, and Today's guidance",
      "Ads shown",
    ],
  },
  STANDARD: {
    name: "Standard",
    description: "Explore a wide variety of topics and spreads, without ads.",
    features: [
      "A wide variety of reading topics",
      "All spreads available up to three times per day (including Celtic Cross)",
      "Reading history saved",
      "No ads",
    ],
  },
  PREMIUM: {
    name: "Premium",
    description: "Enter your own question and enjoy detailed, conversational readings.",
    features: [
      "A wide variety of reading topics",
      "All spreads available up to three times per day",
      "One personal reading per day",
      "*Personal readings let you enter your own question and ask follow-ups",
      "Reading history saved",
      "No ads",
    ],
  },
};

export function getPlanEn(code: string | null | undefined): PlanEn | null {
  if (!code) return null;
  return PLAN_EN[code] ?? null;
}
