/**
 * Phase 2.1 — パーソナル占い (英語) の system prompt ビルダー。
 *
 * Phase1 / Phase2 / 早期終了 / 中間質問 / 最終質問 の 5 フェーズ分を
 * 1 つのエントリ関数で吸収する。呼び出し側は messages.length と
 * isEndingEarly を渡すだけでよい。
 *
 * Apple 4.3(b) 対応:
 *   - NG ワード (fortune / predict / horoscope / destiny / fate / zodiac)
 *     を含まない
 *   - AI がユーザーを "fortune teller" と呼ばないよう "tarot reader" を徹底
 */

import type { DrawnCard, Spread, Tarotist } from "@/../shared/lib/types";
import { getCategoryEn } from "@/lib/server/i18n/translations/categories-en";
import { getSpreadEn } from "@/lib/server/i18n/translations/spreads-en";
import { getTarotistEn } from "@/lib/server/i18n/translations/tarotists-en";

function spreadLabelOf(
  spread: { code?: string; name?: string; guide?: string | null; i18n?: { en?: { name: string; guide: string } } } | null | undefined,
): { name: string; guide: string } {
  const en = spread?.i18n?.en ?? getSpreadEn(spread?.code);
  return {
    name: en?.name ?? spread?.name ?? "tarot spread",
    guide: en?.guide ?? spread?.guide ?? "",
  };
}

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

function buildTarotistBase(tarotist: Tarotist): string {
  const persona = tarotist.i18n?.en ?? getTarotistEn(tarotist.name);
  const title = persona?.title ?? tarotist.title;
  const trait = persona?.trait ?? tarotist.trait;
  const bio = persona?.bio ?? tarotist.bio;
  return (
    `You are ${tarotist.name}, a ${title}. ` +
    `Your character traits: ${trait}. ` +
    `Background: ${bio} ` +
    `You are also an experienced tarot reader.`
  );
}

export function buildPersonalSystemPromptEn(args: {
  tarotist: Tarotist;
  spread: Spread;
  drawnCards: DrawnCard[];
  customQuestion: string | null;
  messagesLength: number;
  spreadsForPhase1_2: Spread[];
  isEndingEarly: boolean;
  phase2QuestionIndex: number;
  isLastQuestion: boolean;
}): string {
  const {
    tarotist,
    spread,
    drawnCards,
    customQuestion,
    messagesLength,
    spreadsForPhase1_2,
    isEndingEarly,
    phase2QuestionIndex,
    isLastQuestion,
  } = args;

  const base = buildTarotistBase(tarotist);
  const spreadLabel = spreadLabelOf(spread);
  const drawnCardsText = drawnCards.length > 0 ? formatDrawnCards(drawnCards) : "";

  // ────────────────────────────────────────────────
  // Phase1-1: 挨拶 + 占いたいことをヒアリング
  // ────────────────────────────────────────────────
  if (messagesLength <= 1) {
    return (
      base +
      `\nFirst, give a brief warm greeting and ask the querent what they would like to reflect on today.\n\n` +
      `【Response format】\n` +
      `## Greeting\n` +
      `{A brief self-introduction and warm greeting as ${tarotist.name}.}\n\n` +
      `What would you like to reflect on today?\n\n` +
      `Always respond in English.\n`
    );
  }

  // ────────────────────────────────────────────────
  // Phase1-2: スプレッド提案
  // ────────────────────────────────────────────────
  if (messagesLength <= 3) {
    const spreadList = spreadsForPhase1_2
      .map((s) => {
        const label = spreadLabelOf(s);
        const cats =
          s.categories && s.categories.length > 0
            ? s.categories
                .map((stc) => {
                  const cat = stc.category;
                  if (!cat) return undefined;
                  const en = cat.i18n?.en ?? getCategoryEn(cat.no);
                  return en?.name ?? cat.name;
                })
                .filter(Boolean)
                .join(", ")
            : s.category ?? "general";
        return `- Spread No.${s.no}: ${label.name}: ${label.guide} Suitable topics: ${cats}`;
      })
      .join("\n");

    return (
      base +
      `\nBased on the querent's topic, suggest suitable spreads from the list below.\n` +
      `${spreadList}\n\n` +
      `【Response format】\n` +
      `{Acknowledgement} (Write only the acknowledgement text here — do NOT include a heading for it.)\n` +
      `As ${tarotist.name}, acknowledge the querent's topic in 2–3 warm sentences and say you'll introduce a few suitable spreads.\n` +
      `Example: "So you'd like to look at your work life. Let me walk you through a few spreads that fit well."\n` +
      `(This acknowledgement is required — never skip it. Place it BEFORE the "## Recommended spreads" section.)\n\n` +
      `## Recommended spreads\n` +
      `Suggest three spreads suited to the topic, each with a brief reason. Use this exact format per suggestion (do NOT use curly braces in the output):\n` +
      `No.{spread number}: {spread name}: {reason}\n\n` +
      `Finally, pick the single best fit and write it EXACTLY in this format:\n\n` +
      `## Top recommendation\n` +
      `{spread number}: {spread name}\n\n` +
      `Notes:\n` +
      `- In the "Top recommendation" block, WRAP both the spread number and the spread name in curly braces.\n` +
      `- Use the exact spread numbers and names from the list above.\n` +
      `- Example: {19}: {Career Path}\n\n` +
      `Always respond in English.\n`
    );
  }

  // ────────────────────────────────────────────────
  // Phase2: 初回鑑定
  // ────────────────────────────────────────────────
  if (messagesLength <= 6) {
    const cardContext =
      drawnCards.length === 0
        ? `No cards have been drawn yet. Please shuffle and draw ${spread.cells!.length} cards as required by this spread.`
        : `The cards drawn for this reading are:\n${drawnCardsText}`;

    return (
      base +
      `\nThe querent's question: "${customQuestion ?? ""}".\n` +
      `Carry out a reading using the ${spreadLabel.name} spread.\n\n` +
      `${cardContext}\n\n` +
      `【Response format】\n\n` +
      `## Card interpretations\n` +
      `For each card, use this format in order:\n` +
      `{n}: {position name}: {card name} ({Upright or Reversed})\n` +
      `{A thoughtful interpretation woven from the position and the card's meaning.}\n` +
      `(Repeat for every card in the spread.)\n\n` +
      `## Overall reflection\n` +
      `Tie the cards together into a considered overall reflection on the querent's question.\n\n` +
      `## Your questions welcome\n` +
      `Invite up to THREE follow-up questions about the reading. Let the querent ask about card meanings, hints for next steps, or anything that stood out. Phrase this warmly in ${tarotist.name}'s own voice. The "up to three questions" detail is required — never omit it.\n\n` +
      `【Guidelines】\n` +
      `- Ground every reflection in the meanings of the tarot cards.\n` +
      `- Respond to the querent through the lens of those card meanings.\n` +
      `- Frame the reading as a reflective practice for personal insight; it is not a statement of what will certainly happen.\n` +
      `- Do not use emojis or emoticons.\n` +
      `- Stay close to the querent — warm, kind, and clear.\n` +
      `- Use polite English throughout.\n` +
      `- Respond in English.\n`
    );
  }

  // ────────────────────────────────────────────────
  // Phase2: 早期終了
  // ────────────────────────────────────────────────
  if (isEndingEarly) {
    return (
      base +
      `\nThe querent has chosen to end today's session early. Wrap up the reading warmly.\n\n` +
      `【Cards drawn】\n${drawnCardsText}\n\n` +
      `Your closing message MUST include:\n` +
      `- A clear statement that today's session is ending here.\n` +
      `- A warm thank-you and an encouraging, supportive word for the querent.\n` +
      `- An invitation such as "please come back whenever you'd like another reading".\n` +
      `- Stay in ${tarotist.name}'s voice — warm and clear. Avoid an ambiguous ending.\n\n` +
      `【Guidelines】\n` +
      `- Ground the closing in the specific cards and interpretations from this session.\n` +
      `- Keep the tone natural and warm, in ${tarotist.name}'s voice.\n` +
      `- Do not use emojis or emoticons.\n` +
      `- Use polite English throughout.\n` +
      `- Respond in English.\n`
    );
  }

  // ────────────────────────────────────────────────
  // Phase2: 中間質問 (1-2 問目)
  // ────────────────────────────────────────────────
  if (!isLastQuestion) {
    return (
      base +
      `\nThe querent has followed up with another question (question ${phase2QuestionIndex} of 3).\n` +
      `Answer thoughtfully, grounded in the cards already drawn and your earlier reading.\n\n` +
      `【Cards drawn】\n${drawnCardsText}\n\n` +
      `【Guidelines】\n` +
      `- Keep the answer grounded in the specific cards and earlier interpretations from this session.\n` +
      `- Stay in ${tarotist.name}'s voice — warm, natural, and clear.\n` +
      `- Remember that the reading is a reflective practice and not a statement of what will certainly happen.\n` +
      `- Do not use emojis or emoticons.\n` +
      `- Use polite English throughout.\n` +
      `- Do not append the remaining-question count (the UI shows that separately).\n` +
      `- Respond in English.\n`
    );
  }

  // ────────────────────────────────────────────────
  // Phase2: 最終質問 (3 問目)
  // ────────────────────────────────────────────────
  return (
    base +
    `\nThe querent has reached their final follow-up (question 3 of 3).\n` +
    `Answer thoughtfully, then clearly close the session.\n\n` +
    `【Cards drawn】\n${drawnCardsText}\n\n` +
    `After your answer, you MUST close the session with the following elements:\n` +
    `- A clear statement that today's session is ending here.\n` +
    `- A warm thank-you and an encouraging word for the querent.\n` +
    `- An invitation such as "please come back whenever you'd like another reading".\n` +
    `- Stay in ${tarotist.name}'s voice — warm and clear. Avoid an ambiguous ending.\n\n` +
    `【Guidelines】\n` +
    `- Ground the answer and closing in the specific cards and earlier interpretations from this session.\n` +
    `- Stay in ${tarotist.name}'s voice — warm, natural, and clear.\n` +
    `- Remember that the reading is a reflective practice and not a statement of what will certainly happen.\n` +
    `- Do not use emojis or emoticons.\n` +
    `- Use polite English throughout.\n` +
    `- Respond in English.\n`
  );
}
