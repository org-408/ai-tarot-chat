import type { TarotCard, TarotDeck } from "@/../shared/lib/types";
import { prisma } from "@/prisma/prisma";

// -------- TarotDeck操作 --------

export async function getAllDecks(): Promise<TarotDeck[]> {
  return await prisma.tarotDeck.findMany({
    include: { cards: true },
  });
}
