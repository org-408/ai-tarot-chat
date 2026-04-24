import type { CardMeaning, DrawnCard, TarotCard } from "../../../../shared/lib/types";

// ─────────────────────────────────────────────
// オフライン占い: カード意味生成ユーティリティ
// ─────────────────────────────────────────────

export interface OfflineCardReading {
  card: TarotCard;
  isReversed: boolean;
  position: string;
  description: string;
  meaningText: string;
  keywords: string[];
}

// decks.cards.meanings の category キー（4種類）に直接対応するカテゴリの定義。
// ReadingCategory.no でキーする (言語非依存)。
//   1: 恋愛 (Love), 2: 仕事 (Work), 5: 健康 (Wellness), 6: 金運 (Money)
export const CLARA_CATEGORY_NOS = [1, 2, 5, 6] as const;

// ReadingCategory.no → CardMeaning.category キーのマッピング
const CATEGORY_NO_TO_MEANING_KEY: Record<number, string> = {
  1: "love",
  2: "career",
  5: "health",
  6: "money",
};

/**
 * カードとカテゴリから意味テキストを取得する。
 * `categoryNo` は ReadingCategory.no (言語非依存) を渡す。
 */
export function getOfflineMeaningText(
  card: TarotCard,
  isReversed: boolean,
  categoryNo: number,
): string {
  const meaningKey = CATEGORY_NO_TO_MEANING_KEY[categoryNo] ?? "love";

  const meanings: CardMeaning[] = card.meanings ?? [];
  const matched = meanings.find((m) => m.category === meaningKey);
  const meaning = matched ?? meanings[0]; // 一致しない場合は最初の意味を使用

  if (!meaning) {
    // フォールバック: キーワードを羅列
    const keywords = isReversed ? card.reversedKeywords : card.uprightKeywords;
    return (keywords ?? []).join("、");
  }

  return isReversed ? meaning.reversed : meaning.upright;
}

/**
 * 引いたカードからオフライン占い結果を生成する
 * `categoryNo` は ReadingCategory.no (言語非依存)
 */
export function generateOfflineReading(
  categoryNo: number,
  drawnCards: DrawnCard[],
): OfflineCardReading[] {
  return drawnCards.map((drawnCard) => {
    const card = drawnCard.card!;
    const isReversed = drawnCard.isReversed ?? false;
    const meaningText = getOfflineMeaningText(card, isReversed, categoryNo);

    return {
      card,
      isReversed,
      position: drawnCard.position ?? "占う対象",
      description: drawnCard.description ?? "",
      meaningText,
      keywords: drawnCard.keywords ?? [],
    };
  });
}
