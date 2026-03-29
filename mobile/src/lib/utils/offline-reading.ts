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

// decks.cards.meanings の category キー（4種類）に直接対応するカテゴリ名
// これが「いつでも占い」で選択できるカテゴリの定義
export const CLARA_CATEGORY_NAMES = ["恋愛", "仕事", "健康", "金運"] as const;

// カテゴリ名 → CardMeaning.category キーのマッピング（直接対応のみ）
const CATEGORY_TO_MEANING_KEY: Record<string, string> = {
  恋愛: "love",
  仕事: "career",
  健康: "health",
  金運: "money",
};

/**
 * カードとカテゴリから意味テキストを取得する
 */
export function getOfflineMeaningText(
  card: TarotCard,
  isReversed: boolean,
  categoryName: string
): string {
  const meaningKey = CATEGORY_TO_MEANING_KEY[categoryName] ?? "love";

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
 */
export function generateOfflineReading(
  categoryName: string,
  drawnCards: DrawnCard[]
): OfflineCardReading[] {
  return drawnCards.map((drawnCard) => {
    const card = drawnCard.card!;
    const isReversed = drawnCard.isReversed ?? false;
    const meaningText = getOfflineMeaningText(card, isReversed, categoryName);

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
