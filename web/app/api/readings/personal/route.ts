// app/api/readings/personal/route.ts

import { DrawnCard, Spread, Tarotist } from "@/../shared/lib/types";
import { homeFreeProviders, providers } from "@/lib/server/ai/models";
import { logWithContext } from "@/lib/server/logger/logger";
import { authService } from "@/lib/server/services/auth";
import { moderatePersonalQuestion } from "@/lib/server/services/moderation";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { NextRequest, NextResponse } from "next/server";

const debugMode = process.env.AI_DEBUG_MODE === "true";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RETRY_COUNT = 3;

export async function POST(req: NextRequest) {
  let clientId = "";
  try {
    logWithContext("info", "パーソナル占いリクエスト開始", {
      path: "/api/readings/personal",
    });

    // sessionチェック（独自トークン検証）
    const payload = await authService.verifyApiRequest(req);
    if ("error" in payload || !payload) {
      logWithContext("warn", "認証失敗", { path: "/api/readings/personal" });
      return new Response("unauthorized", { status: 401 });
    }

    logWithContext("debug", "セッション検証完了", { payload });
    clientId = payload.payload.clientId;
    if (!clientId) {
      logWithContext("warn", "clientId不正", { payload });
      return new Response("unauthorized", { status: 401 });
    }
    logWithContext("info", "Client ID確認", { clientId });

    // リクエストボディ取得
    const {
      messages: clientMessages,
      tarotist,
      spread,
      customQuestion,
      drawnCards,
    }: {
      messages: UIMessage[];
      tarotist: Tarotist;
      spread: Spread;
      customQuestion: string;
      drawnCards: DrawnCard[];
    } = await req.json();
    const provider =
      tarotist && tarotist.provider ? tarotist.provider.toLowerCase() : "groq";

    // 入力バリデーション
    if (!customQuestion || customQuestion.trim().length < 5) {
      logWithContext("warn", "質問が短すぎる", {
        clientId,
        questionLength: customQuestion?.length,
      });
      return Response.json(
        { error: "5文字以上で入力してください" },
        { status: 400 }
      );
    }

    if (customQuestion.trim().length > 200) {
      logWithContext("warn", "質問が長すぎる", {
        clientId,
        questionLength: customQuestion.length,
      });
      return Response.json(
        { error: "200文字以内で入力してください" },
        { status: 400 }
      );
    }

    // モデレーションチェック
    logWithContext("debug", "モデレーションチェック開始", { clientId });
    const moderation = await moderatePersonalQuestion(customQuestion);

    if (!moderation.allowed) {
      logWithContext("warn", "モデレーションNG", {
        clientId,
        reason: moderation.reason,
        category: moderation.category,
      });
      return Response.json(
        {
          error: moderation.message,
          reason: moderation.reason,
          category: moderation.category,
        },
        { status: 400 }
      );
    }

    if (moderation.warning) {
      logWithContext("info", "モデレーション警告", {
        clientId,
        warning: moderation.warning,
      });
    }

    const system =
      `あなたは、${tarotist.title}の${tarotist.name}です。` +
      `あなたの特徴は${tarotist.trait}です。` +
      `あなたのプロフィールは${tarotist.bio}です。` +
      `また、あなたは熟練したタロット占い師です。` +
      `* 相談者から「${customQuestion}」という質問を受けています。\n` +
      `* スプレッドは${spread.name}です。` +
      `タロットカードの意味を踏まえて、優しく丁寧にアドバイスしてください。\n\n` +
      `【制約条件】\n` +
      `- タロット占いの範囲内でのみ回答してください\n` +
      `- 医療、法律、投資の専門的アドバイスは行いません\n` +
      `- 相談者に寄り添い、優しく丁寧に説明すること\n` +
      `- ですます調で話すこと\n` +
      `- 200文字以上400文字以内で回答してください\n`;
    console.log(`[readings/personal/route] Received POST request`, {
      clientMessages,
      tarotist,
      spread,
      customQuestion,
      drawnCards,
      debugMode,
      system,
      provider,
      path: "/api/readings/personal",
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
    logWithContext("error", "パーソナル占いエラー", {
      error,
      clientId,
    });
    return NextResponse.json(
      { error, errorMessage: "Internal Server Error" },
      { status: 500 }
    );
  }
}
