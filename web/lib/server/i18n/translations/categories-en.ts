/**
 * Phase 2.1 — ReadingCategory の英語翻訳。
 * キー: ReadingCategory.no
 *
 * Apple 4.3(b) 対応: "fortune" を避けて "today's guidance" や "money"
 * とする。"zodiac" は使わない。
 */

export type CategoryEn = {
  name: string;
  description: string;
};

export const CATEGORY_EN: Record<number, CategoryEn> = {
  1: {
    name: "Love",
    description: "A tarot reading centered on love.",
  },
  2: {
    name: "Work",
    description: "A tarot reading centered on work.",
  },
  3: {
    name: "Today's guidance",
    description: "A tarot reading for today's guidance.",
  },
  4: {
    name: "Studies",
    description: "A tarot reading centered on your studies.",
  },
  5: {
    name: "Wellness",
    description: "A tarot reading centered on wellness.",
  },
  6: {
    name: "Money",
    description: "A tarot reading centered on money matters.",
  },
  7: {
    name: "Relationships",
    description: "A tarot reading centered on relationships.",
  },
  8: {
    name: "Inner self",
    description: "A tarot reading centered on your inner self.",
  },
  9: {
    name: "Spiritual growth",
    description: "A tarot reading centered on spiritual growth.",
  },
};

export function getCategoryEn(no: number | null | undefined): CategoryEn | null {
  if (typeof no !== "number") return null;
  return CATEGORY_EN[no] ?? null;
}
