import type { DrawnCard, MasterData, Spread, SpreadCell, TarotCard } from "@shared/lib/types";

/**
 * スプレッドに従ってカードをランダムに引く
 */
export function drawRandomCards(masterData: MasterData, spread: Spread): DrawnCard[] {
  const allCards: TarotCard[] = masterData.decks?.[0]?.cards ?? [];
  const spreadCells: SpreadCell[] = spread.cells ?? [];
  const count = spreadCells.length;

  const shuffled = [...allCards].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  return spreadCells.map((cell, index) => {
    const card = selected[index];
    const isReversed = Math.random() > 0.5;

    return {
      id: `${card.code}-${index}`,
      x: cell.x,
      y: cell.y,
      order: cell.order ?? index,
      position: cell.position ?? `位置${index + 1}`,
      description:
        cell.description ??
        `このカードの位置は${cell.position ?? `位置${index + 1}`}を示しています`,
      isHorizontal: cell.isHorizontal,
      isReversed,
      card,
      keywords: !isReversed ? card.uprightKeywords : card.reversedKeywords,
      cardId: card.id,
      createdAt: new Date(),
    };
  });
}

export function getCardImagePath(code: string, isBack = false): string {
  if (isBack) return "/cards/back.png";
  return `/cards/${code}.png`;
}
