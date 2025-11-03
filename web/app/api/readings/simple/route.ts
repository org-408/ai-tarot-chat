import {
  DrawnCard,
  ReadingCategory,
  Spread,
  Tarotist,
} from "@/../shared/lib/types";
import { homeFreeProviders, providers } from "@/lib/server/ai/models";
import { logWithContext } from "@/lib/server/logger/logger";
import { authService } from "@/lib/server/services";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { NextRequest, NextResponse } from "next/server";

const debugMode = process.env.AI_DEBUG_MODE === "true";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Render の関数切断対策にも有効

const RETRY_COUNT = 3;

export async function POST(req: NextRequest) {
  let clientId = "";
  try {
    logWithContext("info", "シンプル占いリクエスト開始", {
      path: "/api/readings/simple",
    });

    // sessionチェック（独自トークン検証）
    const payload = await authService.verifyApiRequest(req);
    if ("error" in payload || !payload) {
      logWithContext("warn", "認証失敗", { path: "/api/readings/simple" });
      return new Response("unauthorized", { status: 401 });
    }

    logWithContext("debug", "セッション検証完了", { payload });
    clientId = payload.payload.clientId;
    if (!clientId) {
      logWithContext("warn", "clientId不正", { payload });
      return new Response("unauthorized", { status: 401 });
    }
    logWithContext("info", "Client ID確認", { clientId });

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
      `また、あなたは熟練したタロット占い師です。` +
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
{簡潔な自己紹介と丁寧にご挨拶をしてください}\n
\n
【カードの解釈】\n
{何枚目か}: {スプレッドの位置の名前}: {カードの名前}(正位置 or 逆位置)\n
- {スプレッドの位置の意味を簡潔に説明してください}\n
- {カードの意味を簡潔に説明してください}\n
{スプレッドの位置とカードの意味を踏まえて、カードの解釈を丁寧に記述してください}\n
...（スプレッドのカード枚数分繰り返す）\n
\n
【総合的な占いの結果】\n
**概要**\n
{相談者の占いたいことについて全てのカードの解釈を踏まえて総合的な占いの結果を簡潔に説明してください}\n
\n
**詳細**\n
{相談者の占いたいことについて全てのカードの解釈を踏まえて総合的な占いの結果を概要に沿って詳細に丁寧に説明してください}\n
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

    console.log(`[readings/simple/route] Received POST request`, {
      clientMessages,
      tarotist,
      spread,
      category,
      drawnCards,
      debugMode,
      system,
      provider,
      path: "/api/readings/simple",
    });

    const messages = convertToModelMessages(clientMessages);

    for (let i = 0; i < RETRY_COUNT; i++) {
      try {
        logWithContext("info", "システムプロンプトとメッセージ変換完了", {
          clientId,
        });
        const result = streamText({
          model:
            i === 0
              ? homeFreeProviders
                ? homeFreeProviders[provider as keyof typeof homeFreeProviders]
                : debugMode
                ? providers["google"]
                : providers[provider as keyof typeof providers]
              : i === 1
              ? homeFreeProviders["gemini25"]
              : homeFreeProviders["google"],
          messages:
            messages.length > 0 ? messages : [{ role: "user", content: "" }],
          system,
          onChunk: (chunk) => {
            console.log(`[readings/simple/route] chunk: `, chunk);
          },
        });

        // テキストストリームのレスポンス（v5公式の推し）
        return result.toUIMessageStreamResponse({
          headers: {
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      } catch (error) {
        logWithContext("error", `シンプル占い試行${i + 1}回目失敗`, {
          error,
          clientId,
        });
        if (i === RETRY_COUNT - 1) {
          throw error;
        }
        logWithContext("info", `シンプル占い再試行します ${i + 2}回目`, {
          clientId,
        });
      }
    }
  } catch (error) {
    logWithContext("error", "シンプル占いエラー", {
      error,
      clientId,
    });
    return NextResponse.json(
      { error, errorMessage: "Internal Server Error" },
      { status: 500 }
    );
  }
}
