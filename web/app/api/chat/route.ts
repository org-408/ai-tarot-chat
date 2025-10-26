import { logWithContext } from "@/lib/server/logger/logger";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import {
  DrawnCard,
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../../../shared/lib/types";

const debugMode = process.env.AI_DEBUG_MODE === "true";

// Google Vertex AI用の認証設定
const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT!,
  location: process.env.GOOGLE_VERTEX_LOCATION!,
  googleAuthOptions: {
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL!,
      // 重要: \n を実際の改行に変換
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    },
  },
});

// プロバイダマッピング
const providers = {
  gpt5nano: openai("gpt-5-nano"),
  gemini25: vertex("gemini-2.5-flash"),
  gemini25pro: vertex("gemini-2.5-pro"),
  claude_h: anthropic("claude-haiku-4-5"),
  gpt41: openai("gpt-4.1"),
  gpt5: openai("gpt-5"),
  claude_s: anthropic("claude-sonnet-4-5"),
  google: google("gemini-2.5-pro"),
};

export async function POST(req: Request) {
  const {
    messages: clientMessages,
    tarotist,
    spread,
    category,
    drawnCards,
  }: {
    messages: UIMessage[];
    tarotist: Tarotist;
    spread: Spread;
    category: ReadingCategory;
    drawnCards: DrawnCard[];
  } = await req.json();
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
              `- ${placement.position}(${placement.card!.name}${
                placement.isReversed ? "逆位置" : "正位置"
              }): ${
                placement.isReversed
                  ? placement.card!.reversedKeywords.join(", ")
                  : placement.card!.uprightKeywords.join(", ")
              }`
          )
          .join("\n")
          .trim()) +
    `\n\n` +
    `【回答フォーマット】\n
【ご挨拶】
{丁寧にご挨拶をしてください}\n
\n
【カードの解釈】\n
- {何枚目か}: {スプレッドの位置の名前}:\n
  - 位置の説明:\n
    {スプレッドの位置の説明}\n
  - {カードの名称}: {正位置 or 逆位置}\n
  - カードの意味:\n
    [カードのキーワードの配列]\n
  - カードの解釈:\n
    {カードの解釈を丁寧に記述してください}\n
...（スプレッドのセル数分繰り返す）\n
\n
【総合的な占いの結果】\n
**概要**\n
{相談者の占いたいことについて全てのカード解釈を踏まえて総合的な占いの結果を簡潔に説明してください}\n
\n
**詳細**\n
{相談者の占いたいことについて全てのカード解釈を踏まえて総合的な占いの結果を概要に沿って詳細に丁寧に説明してください}\n
\n` +
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

  logWithContext("info", "[chat/route] POST req", {
    messages: clientMessages,
    tarotist,
    spread,
    category,
    debugMode,
    system,
    provider,
    path: "/api/chat",
  });
  console.log(`[chat/route] Received POST request`, {
    clientMessages,
    tarotist,
    spread,
    category,
    drawnCards,
    debugMode,
    system,
    provider,
    path: "/api/chat",
  });

  const messages = convertToModelMessages(clientMessages);

  const result = streamText({
    model: debugMode
      ? providers["google"]
      : providers[provider as keyof typeof providers],
    messages: messages.length > 0 ? messages : [{ role: "user", content: "" }],
    system,
    // onChunk: (chunk) => {
    //   console.log(`[chat/route] chunk: `, chunk);
    // },
  });

  // AI SDK v5の標準レスポンス形式
  return result.toUIMessageStreamResponse();
}
