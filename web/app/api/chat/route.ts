import { logWithContext } from "@/lib/server/logger/logger";
import { createAgent } from "langchain";
import {
  DrawnCard,
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../../../shared/lib/types";

// プロバイダマッピング - LangChain 1.0の新しいモデル指定方式
function getModelString(provider: string): string {
  const providerLower = provider.toLowerCase();

  switch (providerLower) {
    case "gpt5nano":
      return "openai:gpt-5-nano";
    case "gemini25":
      return "google-vertexai:gemini-2.5-flash";
    case "gemini25pro":
      return "google-vertexai:gemini-2.5-pro";
    case "claude_h":
      return "anthropic:claude-haiku-4-5";
    case "gpt41":
      return "openai:gpt-4.1";
    case "gpt5":
      return "openai:gpt-5";
    case "claude_s":
      return "anthropic:claude-sonnet-4-5";
    default:
      return "openai:gpt-5-nano"; // デフォルトは最安のgpt-5-nano
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
      drawnCards,
      path: "/api/chat",
    });
    console.log("[chat/route] POST req", {
      messages: clientMessages,
      tarotist,
      spread,
      category,
      drawnCards,
    });

    const provider = tarotist?.provider?.toLowerCase() || "gpt5nano";

    // システムプロンプトを作成
    const systemPrompt =
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
      modelString: getModelString(provider),
    });

    // LangChain 1.0: createAgentでエージェント作成
    const agent = createAgent({
      model: getModelString(provider),
      tools: [], // タロット占いではツール不要
      systemPrompt,
    });

    // メッセージ履歴を構築
    const messages = clientMessages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // LangChain 1.0: streamMode: "messages" でトークンレベルストリーミング
    const stream = await agent.stream({ messages }, { streamMode: "messages" });

    // ReadableStreamを作成してSSE形式で返す
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // streamMode: "messages" は [token, metadata] のタプルを返す
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          for await (const [token, metadata] of stream) {
            // contentBlocksから実際のテキストを抽出
            if (token.contentBlocks && Array.isArray(token.contentBlocks)) {
              for (const block of token.contentBlocks) {
                if (block.type === "text" && block.text) {
                  // SSE形式: data: {content}\n\n
                  const sseData = `data: ${JSON.stringify({
                    content: block.text,
                  })}\n\n`;
                  controller.enqueue(encoder.encode(sseData));
                }
              }
            }
          }

          // ストリーム終了シグナル
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (streamError) {
          console.error("[chat/route] Stream error:", streamError);
          const errorMessage =
            streamError instanceof Error
              ? streamError.message
              : "Unknown error";
          controller.error(new Error(errorMessage));
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
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
