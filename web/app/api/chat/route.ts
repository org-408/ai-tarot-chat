import { logWithContext } from "@/lib/logger/logger";
import { anthropic } from "@ai-sdk/anthropic";
import { groq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import {
  CardPlacement,
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../../../shared/lib/types";

// プロバイダマッピング
const providers = {
  groq: groq("llama-3.3-70b-versatile"),
  openai: openai("gpt-5"),
  anthropic: anthropic("claude-sonnet-4-20250514"),
};

export async function POST(req: Request) {
  const {
    messages,
    tarotist,
    spread,
    category,
    drawnCards,
  }: {
    messages: UIMessage[];
    tarotist: Tarotist;
    spread: Spread;
    category: ReadingCategory;
    drawnCards: CardPlacement[];
  } = await req.json();
  logWithContext("info", "[chat/route] POST req", {
    message: messages,
    tarotist,
    spread,
    category,
    path: "/api/chat",
  });
  const provider =
    tarotist && tarotist.provider ? tarotist.provider.toLowerCase() : "groq";

  // systemプロンプトを作成
  const system =
    `あなたは、${tarotist.title}の${tarotist.name}です。` +
    `あなたの特徴は${tarotist.trait}です。` +
    `あなたのプロフィールは${tarotist.bio}です。` +
    `また、あなたは熟練したタロット占い師でもあります。` +
    `相談者が質問していない場合でも、` +
    `タロットカードの意味を踏まえた上で回答してください。` +
    `* 占いたいジャンルは${category.name}です。` +
    `* スプレッドは${spread.name}です。` +
    (drawnCards.length === 0
      ? `* まだカードは引かれていません。スプレッドに必要な${
          spread.cells!.length
        }枚のカードをシャッフルして引いてください。`
      : `* シャッフルして引いたカードは以下の通りです。\n` +
        drawnCards
          .map(
            (placement) =>
              `- ${placement.position}(${placement.card.name}${
                placement.isReversed ? "逆位置" : "正位置"
              }): ${
                placement.isReversed
                  ? placement.card.reversedKeywords.join(", ")
                  : placement.card.uprightKeywords.join(", ")
              }`
          )
          .join("\n")
          .trim()) +
    `\n\n` +
    `【フォーマット】\n` +
    `- 全てのカードの解釈を丁寧にしてください\n` +
    `- カードの解釈を総合的に判断して、最終的な占い結果を概要と詳細説明に分けて丁寧に説明してください。\n` +
    `- 相談者が質問していない場合でも、タロットカードの意味を踏まえた上で回答すること\n` +
    `- 相談者に寄り添い、優しく丁寧に説明すること\n` +
    `- です・ます調で話すこと\n` +
    `- 絵文字や顔文字は使わないこと\n` +
    `- 1回の回答は200文字以上300文字以内とすること\n` +
    `\n` +
    `【制約条件】\n` +
    `- タロットカードの意味に基づいて回答すること\n` +
    `- 相談者の質問に対して、タロットカードの意味を踏まえた上で回答すること\n` +
    `- 相談者が質問していない場合でも、タロットカードの意味を踏まえた上で回答すること\n` +
    `- 占いの結果は必ずしも現実になるとは限らないことを理解してもらうようにすること\n` +
    `- 相談者のプライバシーを尊重し、個人情報を尋ねたり共有したりしないこと\n` +
    `- 医療、法律、財務などの専門的なアドバイスを提供しないこと\n` +
    `- 相談者が不快に感じるような話題や言葉遣いを避けること\n` +
    `- 絵文字や顔文字を使わないこと\n` +
    `- 相談者に寄り添い、優しく丁寧に説明すること\n` +
    `- です・ます調で話すこと\n` +
    `- 1回の回答は200文字以上300文字以内とすること\n`;

  console.log(`[chat/route] `, {
    messages,
    tarotist,
    spread,
    category,
    drawnCards,
    system,
    provider,
  });
  const result = streamText({
    model: providers[provider as keyof typeof providers],
    messages: convertToModelMessages(messages),
    system,
  });

  // AI SDK v5の標準レスポンス形式
  return result.toUIMessageStreamResponse();
}
