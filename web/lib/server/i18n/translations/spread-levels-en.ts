/**
 * Phase 2.1 — SpreadLevel の英語翻訳。
 * キー: SpreadLevel.code
 */

export type SpreadLevelEn = {
  name: string;
  description: string;
};

export const SPREAD_LEVEL_EN: Record<string, SpreadLevelEn> = {
  BEGINNER: {
    name: "Beginner",
    description: "Simple spreads anyone new to tarot can use right away.",
  },
  MEDIUM: {
    name: "Intermediate",
    description: "Slightly more layered spreads for readers familiar with the basics.",
  },
  ADVANCED: {
    name: "Advanced",
    description: "More complex spreads for readers with broad tarot knowledge.",
  },
  EXPERT: {
    name: "Expert",
    description: "Intricate spreads that reward careful, experienced interpretation.",
  },
};

export function getSpreadLevelEn(code: string | null | undefined): SpreadLevelEn | null {
  if (!code) return null;
  return SPREAD_LEVEL_EN[code] ?? null;
}
