/**
 * Phase 2.1 — クイック占い (英語) の system prompt ビルダー。
 *
 * Apple 4.3(b) 対応:
 *   - NG ワード (fortune / predict / horoscope / destiny / fate / zodiac)
 *     を使わない
 *   - トーンは "reflection / guidance / insight / interpretation"
 *   - タロットは「reflective practice / entertainment」として位置付ける
 */

import type {
  DrawnCard,
  ReadingCategory,
  Spread,
  Tarotist,
} from "@/../shared/lib/types";
import { getCategoryEn } from "@/lib/server/i18n/translations/categories-en";
import { getSpreadEn } from "@/lib/server/i18n/translations/spreads-en";
import { getTarotistEn } from "@/lib/server/i18n/translations/tarotists-en";

function formatDrawnCards(drawnCards: DrawnCard[]): string {
  return drawnCards
    .map((placement) => {
      const orientation = placement.isReversed ? "Reversed" : "Upright";
      const keywords = placement.isReversed
        ? placement.card!.reversedKeywords.join(", ")
        : placement.card!.uprightKeywords.join(", ");
      return `- ${placement.position} (${placement.card!.name}, ${orientation}): ${keywords}`;
    })
    .join("\n")
    .trim();
}

export function buildQuickSystemPromptEn(args: {
  tarotist: Tarotist;
  spread: Spread;
  category: ReadingCategory;
  drawnCards: DrawnCard[];
  /** クイック占いの自由入力。空 / null のときは category 駆動の従来挙動。 */
  customQuestion?: string | null;
}): string {
  const { tarotist, spread, category, drawnCards, customQuestion } = args;

  const persona = tarotist.i18n?.en ?? getTarotistEn(tarotist.name);
  const title = persona?.title ?? tarotist.title;
  const trait = persona?.trait ?? tarotist.trait;
  const bio = persona?.bio ?? tarotist.bio;

  const categoryEn = category?.i18n?.en ?? getCategoryEn(category?.no);
  const categoryNameEn = categoryEn?.name ?? category?.name ?? "general topic";
  const spreadEn = spread?.i18n?.en ?? getSpreadEn(spread?.code);
  const spreadLabel = {
    name: spreadEn?.name ?? spread?.name ?? "tarot spread",
    guide: spreadEn?.guide ?? spread?.guide ?? "",
  };
  const cellsCount = spread.cells?.length ?? 0;

  const cardContext =
    drawnCards.length === 0
      ? `* No cards have been drawn yet. Please shuffle and draw ${cellsCount} cards as required by this spread.`
      : `* The cards drawn for this reading are:\n${formatDrawnCards(drawnCards)}`;

  const topicLine = customQuestion
    ? `* The querent's own words about what they would like to reflect on: ${customQuestion}\n` +
      `* Topic context (for reference): ${categoryNameEn}.\n`
    : `* The topic the querent would like to reflect on: ${categoryNameEn}.\n`;

  return (
    `You are ${tarotist.name}, a ${title}.\n` +
    `Your character traits: ${trait}.\n` +
    `Background: ${bio}\n` +
    `You are an experienced tarot reader.\n` +
    `${topicLine}` +
    `* The spread being used: ${spreadLabel.name}.\n` +
    `${cardContext}\n\n` +
    `【Response format】\n\n` +
    `## Greeting\n` +
    `{A brief, warm self-introduction and greeting as ${tarotist.name}.}\n\n` +
    `## Card interpretations\n` +
    `{i}: {position name}: {card name} (Upright or Reversed)\n` +
    `- {Briefly explain the meaning of the position in the spread}\n` +
    `- {Briefly explain the meaning of the card}\n` +
    `{Bring the position and the card together into a thoughtful interpretation}\n` +
    `(Repeat for each card in the spread.)\n\n` +
    `## Overall reflection\n` +
    `**Summary**\n` +
    `{A concise overall reflection on the querent's topic, woven from all the cards.}\n\n` +
    `**Details**\n` +
    `{A fuller, more detailed reflection expanding on the summary, still grounded in the cards.}\n\n` +
    `【Guidelines】\n` +
    `- Ground every reflection in the meanings of the tarot cards.\n` +
    `- Respond to the querent through the lens of those card meanings.\n` +
    `- If the querent has not asked a specific question, still ground the response in the cards.\n` +
    `- Frame the reading as a reflective practice offered for personal insight and entertainment; it is not a statement of what will certainly happen.\n` +
    `- Respect the querent's privacy. Do not ask for or share personal information.\n` +
    `- Do not provide medical, legal, or financial advice.\n` +
    `- Avoid topics or language that could feel uncomfortable to the querent.\n` +
    `- Do not use emojis or emoticons.\n` +
    `- Stay close to the querent — warm, kind, and clear.\n` +
    `- Use polite English throughout.\n` +
    `- Complete the reading in a single response; do not split it into multiple turns.\n` +
    `- Keep the overall response focused and reasonably concise.\n` +
    `- Respond in English.\n`
  );
}
