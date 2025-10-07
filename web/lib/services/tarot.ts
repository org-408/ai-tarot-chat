import type { TarotDeck } from "@/../shared/lib/types";
import { tarotRepository } from "../repositories";

// -------- TarotDeck操作 --------

export async function getAllDecks(all: boolean = false, language: string = "ja"): Promise<TarotDeck[]> {
  return await tarotRepository.getAllDecks(all, language);
}
