import type { DrawnCard, MasterData, TarotCard } from "@shared/lib/types";

export function buildTarotCardMap(masterData: MasterData | null): Map<string, TarotCard> {
  return new Map((masterData?.decks?.[0]?.cards ?? []).map((card) => [card.id, card]));
}

export function hydrateDrawnCards(
  cards: DrawnCard[] | undefined,
  cardMap: Map<string, TarotCard>,
): DrawnCard[] {
  return (cards ?? []).map((card) => ({
    ...card,
    card: card.card ?? cardMap.get(card.cardId),
  }));
}
