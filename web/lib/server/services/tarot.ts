import type {
  TarotCard,
  TarotDeck,
  TarotDeckInput,
} from "@/../shared/lib/types";
import { tarotRepository } from "@/lib/server/repositories";

export class TarotService {
  /**
   * デッキ一覧の取得
   * @param all - 非アクティブなデッキも含めるかどうか
   * @param language - 言語コード（デフォルト: "ja"）
   */
  async getAllDecks(
    all: boolean = false,
    language: string = "ja"
  ): Promise<TarotDeck[]> {
    return await tarotRepository.getAllDecks(all, language);
  }

  /**
   * カード一覧の取得
   * @param all - 非アクティブなデッキも含めるかどうか
   * @param language - 言語コード（デフォルト: "ja"）
   */
  async getAllCards(all: boolean = false, language: string = "ja") {
    return await tarotRepository.getAllCards(all, language);
  }

  /**
   * タロットデッキの作成
   */
  async createDeck(deckData: TarotDeckInput) {
    return await tarotRepository.createDeck(deckData);
  }

  /**
   * タロットカードの作成
   */
  async createCard(
    cardData: Omit<TarotCard, "id" | "createdAt" | "updatedAt" | "deck">
  ) {
    return await tarotRepository.createCard(cardData);
  }

  /**
   * アクティブなデッキの取得
   */
  async getActiveDeck(): Promise<TarotDeck | null> {
    return await tarotRepository.getActiveDeck();
  }

  /**
   * デッキIDからデッキを取得
   */
  async getDeckById(id: string): Promise<TarotDeck | null> {
    return await tarotRepository.getDeckById(id);
  }

  /**
   * カードIDからカードを取得
   */
  async getCardById(id: string) {
    return await tarotRepository.getCardById(id);
  }
}

export const tarotService = new TarotService();
