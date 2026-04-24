/**
 * Phase 2.1 — カテゴリ/スプレッドの英語ラベル (段階 1b)。
 *
 * 現時点で DB の `ReadingCategory` / `Spread` / `SpreadCell` には
 * language カラムがない (段階 2 で対応予定)。英語リクエストの prompt に
 * 差し込むため、言語非依存の識別子 (`ReadingCategory.no`, `Spread.code`)
 * をキーに英訳を保持する。
 *
 * Apple 4.3(b) 対応の NG ワード (fortune / predict / horoscope /
 * destiny / fate / zodiac) を含まない語彙を使用する。
 */

// ReadingCategory.no → 英語名
// 例: no=3 の「今日の運勢」は "fortune" を連想させる "today's fortune"
// を避け、"today's guidance" とする。
export const CATEGORY_NAME_EN: Record<number, string> = {
  1: "Love",
  2: "Work",
  3: "Today's guidance",
  4: "Studies",
  5: "Wellness",
  6: "Money",
  7: "Relationships",
  8: "Inner self",
  9: "Spiritual growth",
};

// Spread.code → 英語名・ガイド
// ガイドは AI が候補を提示するときに使用する。NG ワード排除のため
// 日本語の「占う」は "explore / reflect on" に置き換える。
type SpreadLabelEn = {
  name: string;
  guide: string;
};

export const SPREAD_LABELS_EN: Record<string, SpreadLabelEn> = {
  one_card: {
    name: "One Card",
    guide: "A single card to capture a gentle reflection for the moment.",
  },
  three_card_ppf: {
    name: "Three Cards (Past / Present / Future)",
    guide: "Three cards covering past influences, the present moment, and possible next steps.",
  },
  three_card_sao: {
    name: "Three Cards (Situation / Action / Outcome)",
    guide: "Three cards exploring the current situation, an action to consider, and a likely outcome.",
  },
  three_card_mbs: {
    name: "Three Cards (Mind / Body / Spirit)",
    guide: "Three cards reflecting the state of mind, body, and spirit.",
  },
  love_triangle: {
    name: "Love Triangle",
    guide: "A spread for reflecting on the dynamics between you and the people involved in a romantic situation.",
  },
  interview_spread: {
    name: "Interview Spread",
    guide: "A spread focused on preparing mentally for an interview or important conversation.",
  },
  relationship_spread: {
    name: "Relationship Spread",
    guide: "A spread for looking closely at the shape of a relationship — its strengths, challenges, and direction.",
  },
  reunion_spread: {
    name: "Reconnection Spread",
    guide: "A spread for reflecting on the possibility of reconnecting with someone from your past.",
  },
  health_check: {
    name: "Wellness Check",
    guide: "A spread for reflecting on your overall sense of wellness and daily balance.",
  },
  investment_spread: {
    name: "Investment Reflection",
    guide: "A spread for thinking through a financial choice with a calm, considered perspective.",
  },
  five_card_spread: {
    name: "Five Card Spread",
    guide: "A five-card spread giving a fuller picture of a situation from multiple angles.",
  },
  soulmate_spread: {
    name: "Soulmate Spread",
    guide: "A spread for reflecting on deep connections and the kind of partner you resonate with.",
  },
  money_block_clearing: {
    name: "Money Block Reflection",
    guide: "A spread for exploring inner patterns that may be getting in the way of your relationship with money.",
  },
  mental_block_clearing: {
    name: "Mindset Block Reflection",
    guide: "A spread for looking at mental or emotional patterns that may be holding you back.",
  },
  work_life_balance: {
    name: "Work-Life Balance",
    guide: "A spread for reflecting on how your work and personal life are currently weighing against each other.",
  },
  money_forecast: {
    name: "Money Outlook",
    guide: "A spread for reflecting on the possible direction of your finances over the coming period.",
  },
  relationship_health: {
    name: "Relationship Health Check",
    guide: "A spread for taking a gentle look at the overall health of a relationship.",
  },
  healing_journey: {
    name: "Healing Journey",
    guide: "A spread for reflecting on an emotional or personal healing process you are moving through.",
  },
  career_path: {
    name: "Career Path",
    guide: "A spread for exploring career possibilities and the next chapter of your working life.",
  },
  energy_balance: {
    name: "Energy Balance",
    guide: "A spread for reflecting on how your inner energy is distributed across different areas of life.",
  },
  horseshoe_spread: {
    name: "Horseshoe Spread",
    guide: "A seven-card spread giving a broad, arching view of a situation.",
  },
  celtic_cross: {
    name: "Celtic Cross",
    guide: "The classic ten-card spread offering a comprehensive, multi-angle reflection.",
  },
  year_spread: {
    name: "Year Ahead",
    guide: "A spread for reflecting on themes that may unfold across the coming year.",
  },
  astrological_spread: {
    name: "Astrological Houses Spread",
    guide: "A spread structured around the twelve houses of traditional astrology, for a wide-ranging life reflection.",
  },
  tree_of_life: {
    name: "Tree of Life",
    guide: "A spread based on the Kabbalistic Tree of Life, inviting a deep spiritual reflection.",
  },
  grand_tableau: {
    name: "Grand Tableau",
    guide: "An expansive spread giving a layered, panoramic reflection across many areas of life.",
  },
};

export function getCategoryNameEn(
  category: { no?: number; name?: string } | null | undefined,
): string {
  if (!category) return "general topic";
  if (typeof category.no === "number" && CATEGORY_NAME_EN[category.no]) {
    return CATEGORY_NAME_EN[category.no];
  }
  return category.name ?? "general topic";
}

export function getSpreadLabelEn(
  spread: { code?: string; name?: string; guide?: string | null } | null | undefined,
): SpreadLabelEn {
  if (spread?.code && SPREAD_LABELS_EN[spread.code]) {
    return SPREAD_LABELS_EN[spread.code];
  }
  return {
    name: spread?.name ?? "tarot spread",
    guide: spread?.guide ?? "A tarot spread to support your reflection.",
  };
}
