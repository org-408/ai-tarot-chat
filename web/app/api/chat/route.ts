import { logWithContext } from "@/lib/server/logger/logger";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { ChatOpenAI } from "@langchain/openai";
import {
  DrawnCard,
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../../../shared/lib/types";

// Google Vertex AI認証設定
const vertexAIConfig = {
  project: process.env.GOOGLE_VERTEX_PROJECT!,
  location: process.env.GOOGLE_VERTEX_LOCATION!,
  googleAuthOptions: {
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    },
  },
};

// プロバイダマッピング - LangChain 1.0対応
function getModel(provider: string) {
  const providerLower = provider.toLowerCase();

  switch (providerLower) {
    case "gpt5nano":
      return new ChatOpenAI({ model: "gpt-5-nano" });
    case "gemini25":
      return new ChatVertexAI({
        model: "gemini-2.5-flash",
        ...vertexAIConfig,
      });
    case "gemini25pro":
      return new ChatVertexAI({
        model: "gemini-2.5-pro",
        ...vertexAIConfig,
      });
    case "claude_h":
      return new ChatAnthropic({ model: "claude-haiku-4-5" });
    case "gpt41":
      return new ChatOpenAI({ model: "gpt-4.1" });
    case "gpt5":
      return new ChatOpenAI({ model: "gpt-5" });
    case "claude_s":
      return new ChatAnthropic({ model: "claude-sonnet-4-5" });
    default:
      return new ChatOpenAI({ model: "gpt-4o" });
  }
}

export async function POST(req: Request) {
  try {
    const {
      messages: clientMessages,
      tarotist,
      spread,
      category,
      drawnCards,
    }: {
      messages: Array<{ role: string; content: string }>;
      tarotist: Tarotist;
      spread: Spread;
      category: ReadingCategory;
      drawnCards: DrawnCard[];
    } = await req.json();

    logWithContext("info", "[chat/route] POST req", {
      messages: clientMessages,
      tarotist,
      spread,
      category,
      path: "/api/chat",
    });

    const provider = tarotist?.provider?.toLowerCase() || "gpt4";

    // システムプロンプトを作成
    const systemContent =
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

    console.log(`[chat/route] LangChain 1.0 streaming`, {
      clientMessages,
      tarotist,
      provider,
    });

    // LangChain 1.0のモデル取得
    const model = getModel(provider);

    // メッセージ履歴を構築 - LangChainのメッセージクラスを使用
    const messages = [
      new SystemMessage(systemContent),
      ...clientMessages.map((msg) => new HumanMessage(msg.content)),
    ];

    // LangChain 1.0: .stream()でトークンレベルストリーミング
    const stream = await model.stream(messages);

    // ReadableStreamを作成してSSE形式で返す
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // チャンクからcontentを抽出
            const content = chunk.content;

            if (content && typeof content === "string") {
              // SSE形式: data: {chunk}\n\n
              const sseData = `data: ${JSON.stringify({ content })}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }
          }

          // ストリーム終了シグナル
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (streamError) {
          console.error("[chat/route] Stream error:", streamError);
          controller.error(streamError);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // nginx buffering無効化
      },
    });
  } catch (error) {
    console.error("[chat/route] Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
