/**
 * Phase 2.1 — Spread の英語翻訳 (name, guide)。
 * キー: Spread.code
 *
 * Apple 4.3(b) NG ワード (fortune / predict / horoscope / destiny /
 * fate / zodiac) を含まない語彙に統一。
 */

export type SpreadEn = {
  name: string;
  guide: string;
};

export const SPREAD_EN: Record<string, SpreadEn> = {
  one_card: {
    name: "One Card",
    guide:
      "The simplest spread. Hold your question in mind and draw a single card; it offers an answer or a gentle hint.",
  },
  three_card_ppf: {
    name: "Three Cards (Past / Present / Future)",
    guide:
      "The most foundational spread for tracing the flow of time — past influence → current situation → the direction things could unfold.",
  },
  three_card_sao: {
    name: "Three Cards (Situation / Action / Outcome)",
    guide:
      "A problem-solving spread: current situation → action to consider → the likely outcome. Practical and action-oriented.",
  },
  three_card_mbs: {
    name: "Three Cards (Mind / Body / Spirit)",
    guide:
      "A holistic wellness reading — check the balance across mind, body, and spirit in a single glance.",
  },
  love_triangle: {
    name: "Love Triangle",
    guide:
      "A spread for reflecting on the dynamics between you and the people involved in a romantic situation.",
  },
  interview_spread: {
    name: "Interview Spread",
    guide:
      "A spread focused on preparing for an interview or any important conversation — your strengths, the other side's impression, and what to keep in mind.",
  },
  relationship_spread: {
    name: "Relationship Spread",
    guide:
      "A spread for looking closely at the shape of a relationship — its strengths, challenges, and direction.",
  },
  reunion_spread: {
    name: "Reconnection Spread",
    guide:
      "A spread for reflecting on the possibility of reconnecting with someone from your past.",
  },
  health_check: {
    name: "Wellness Check",
    guide:
      "A spread for reflecting on your overall sense of wellness — physical, mental, and a path of healing.",
  },
  investment_spread: {
    name: "Investment Reflection",
    guide:
      "A spread for thinking through a financial choice with a calm, considered perspective.",
  },
  five_card_spread: {
    name: "Five Card Spread",
    guide:
      "A five-card layout giving a fuller picture of a situation from multiple angles.",
  },
  soulmate_spread: {
    name: "Soulmate Spread",
    guide:
      "A spread for reflecting on deep connections and the kind of partner who resonates with you.",
  },
  money_block_clearing: {
    name: "Money Block Reflection",
    guide:
      "A spread for exploring inner patterns that may be getting in the way of your relationship with money.",
  },
  mental_block_clearing: {
    name: "Mindset Block Reflection",
    guide:
      "A spread for looking at mental or emotional patterns that may be holding you back.",
  },
  work_life_balance: {
    name: "Work-Life Balance",
    guide:
      "A spread for reflecting on how your work and personal life are currently weighing against each other.",
  },
  money_forecast: {
    name: "Money Outlook",
    guide:
      "A spread for reflecting on the possible direction of your finances over the coming period.",
  },
  relationship_health: {
    name: "Relationship Health Check",
    guide:
      "A spread for taking a gentle look at the overall health of a relationship.",
  },
  healing_journey: {
    name: "Healing Journey",
    guide:
      "A spread for reflecting on an emotional or personal healing process you are moving through.",
  },
  career_path: {
    name: "Career Path",
    guide:
      "A spread for exploring career possibilities and the next chapter of your working life.",
  },
  energy_balance: {
    name: "Energy Balance",
    guide:
      "A spread for reflecting on how your inner energy is distributed across different areas of life.",
  },
  horseshoe_spread: {
    name: "Horseshoe Spread",
    guide:
      "A seven-card spread giving a broad, arching view of a situation.",
  },
  celtic_cross: {
    name: "Celtic Cross",
    guide:
      "The classic ten-card spread offering a comprehensive, multi-angle reflection.",
  },
  year_spread: {
    name: "Year Ahead",
    guide:
      "A spread for reflecting on themes that may unfold across the coming year.",
  },
  astrological_spread: {
    name: "Astrological Houses Spread",
    guide:
      "A spread structured around the twelve astrological houses, for a wide-ranging life reflection.",
  },
  tree_of_life: {
    name: "Tree of Life",
    guide:
      "A spread based on the Kabbalistic Tree of Life, inviting a deep spiritual reflection.",
  },
  grand_tableau: {
    name: "Grand Tableau",
    guide:
      "An expansive spread giving a layered, panoramic reflection across many areas of life.",
  },
};

export function getSpreadEn(code: string | null | undefined): SpreadEn | null {
  if (!code) return null;
  return SPREAD_EN[code] ?? null;
}
