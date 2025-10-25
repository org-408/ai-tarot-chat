import { logWithContext } from "@/lib/server/logger/logger";
import { createResponse } from "better-sse";
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

export async function POST(request: Request) {
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
    } = await request.json();

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

    console.log(`[chat/route] LangChain 1.0 + better-sse streaming`, {
      clientMessages,
      tarotist,
      provider,
      systemPrompt,
      modelString: getModelString(provider),
    });

    // better-sse の createResponse を使用
    return createResponse(request, async (session) => {
      try {
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
        const stream = await agent.stream(
          { messages },
          { streamMode: "messages" }
        );

        // better-sse でストリーム送信 NOTE: metadataは現状使っていない。使用したい場合は[token, metadata]の形で受け取る
        for await (const [token] of stream) {
          // contentBlocksから実際のテキストを抽出
          if (token.contentBlocks && Array.isArray(token.contentBlocks)) {
            for (const block of token.contentBlocks) {
              if (block.type === "text" && block.text) {
                // better-sse の push メソッドでSSE送信
                await session.push({ content: block.text }, "message");
              }
            }
          }
        }

        // 終了シグナル
        await session.push("[DONE]", "done");
      } catch (streamError) {
        console.error("[chat/route] Stream error:", streamError);
        await session.push(
          {
            error:
              streamError instanceof Error
                ? streamError.message
                : "Streaming error occurred",
          },
          "error"
        );
      }
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
