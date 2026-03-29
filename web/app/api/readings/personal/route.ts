// app/api/readings/personal/route.ts

import { DrawnCard, Spread, Tarotist } from "@/../shared/lib/types";
import { homeFreeProviders, providers } from "@/lib/server/ai/models";
import { logWithContext } from "@/lib/server/logger/logger";
import { clientService, spreadService } from "@/lib/server/services";
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
      drawnCards,
    }: {
      messages: UIMessage[];
      tarotist: Tarotist;
      spread: Spread;
      customQuestion: string;
      drawnCards: DrawnCard[];
    } = await req.json();
    const customQuestion =
      clientMessages.length >= 2
        ? clientMessages[2].parts
            .filter((part) => part.type === "text")
            .map((part) => (part as { text: string }).text)
            .join("")
        : null;
    const provider =
      tarotist && tarotist.provider ? tarotist.provider.toLowerCase() : "groq";

    // 入力バリデーション clientMessages.length === 3 のとき質問文チェック
    if (clientMessages.length === 3) {
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
    }

    // ✅ パーソナル占いの残回数チェック（実際の占いフェーズ開始時のみ）
    //    length <= 1: 挨拶フェーズ、length <= 3: スプレッド提案フェーズ
    //    length > 3: 実際の占いフェーズ → ここで初めて personal カウントを消費
    if (clientMessages.length > 3) {
      const usage = await clientService.getUsageAndReset(clientId);
      if (usage.remainingPersonal <= 0) {
        logWithContext("warn", "パーソナル占いの回数上限", { clientId });
        return NextResponse.json(
          { error: "本日のパーソナル占いの回数上限に達しました" },
          { status: 429 }
        );
      }
    }

    const spreads = await spreadService.getAllSpreads();

    // Phase2 追加質問のインデックスを算出
    // Phase1(4) + auto(1) + AI鑑定(1) = 6 → 7以降がユーザーの追加質問
    // 7: 1問目, 9: 2問目, 11: 3問目
    const phase2QuestionIndex =
      clientMessages.length > 6
        ? Math.floor((clientMessages.length - 5) / 2)
        : 0;
    const isLastQuestion = phase2QuestionIndex >= 3;

    const drawnCardsText =
      drawnCards.length > 0
        ? drawnCards
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
            .trim()
        : "";

    const tarotistBase =
      `あなたは、${tarotist.title}の${tarotist.name}です。` +
      `あなたの特徴は${tarotist.trait}です。` +
      `あなたのプロフィールは${tarotist.bio}です。` +
      `また、あなたは熟練したタロット占い師です。`;

    const system =
      tarotistBase +
      (clientMessages.length <= 1
        ? `まずは簡単なご挨拶とユーザーに占いたい内容を質問してください。` +
          `\n\n` +
          `【回答フォーマット】\n
【ご挨拶】\n
{簡潔な自己紹介と丁寧にご挨拶をしてください}\n
\n
本日はどのようなことを占いましょうか？\n`
        : clientMessages.length <= 3
        ? `ユーザーの質問に対してスプレッドを提案してください。スプレッドは以下から選んでください。` +
          spreads
            .map(
              (s) => `- ${s.name}: ${s.guide}: 適したジャンル: ${s.category}`
            )
            .join("\n") +
          `\n\n` +
          `【回答フォーマット】\n
【おすすめのスプレッド】\n
相談者の質問に対して適したスプレッドを３つ提案し理由を説明してください
最後に、その中で最もおすすめのスプレッドを１つ選択して、スプレッド名を必ず{スプレッド番号}: {スプレッド名}の形式で記述してください。

【特におすすめのスプレッド】
{スプレッド番号}: {スプレッド名}


※フォーマット説明: スプレッド番号とスプレッド名の両方を波括弧{}で囲んでください
※例えばスプレッド番号が7でスプレッド名が「ケルト十字」なら: {7}: {ケルト十字}
※スプレッド番号、スプレッド名のそれぞれに波括弧を忘れないでください
`
        : clientMessages.length <= 6
        ? // Phase2 初回鑑定
          `ユーザーの質問に対して、選ばれたスプレッド「${spread.name}」で占いを行ってください。` +
          `質問内容は「${customQuestion}」です。` +
          (drawnCards.length === 0
            ? `* まだカードは引かれていません。スプレッドに必要な${
                spread.cells!.length
              }枚のカードをシャッフルして引いてください。`
            : `* シャッフルして引いたカードは以下の通りです。\n` + drawnCardsText) +
          `\n\n` +
          `【回答フォーマット】\n
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
          `- 占いの結果は必ずしも現実になるとは限らないことを理解してもらうようにすること\n` +
          `- 絵文字や顔文字を使わないこと\n` +
          `- 相談者に寄り添い、優しく丁寧に説明すること\n` +
          `- です・ます調で話すこと\n` +
          `- 1回の回答は200文字以上300文字以内とすること\n`
        : // Phase2 追加質問（1〜3問目）
          `先ほどの鑑定に続き、相談者から追加の質問を受けています。` +
          `引いたカードと鑑定内容を踏まえて、${tarotist.name}として丁寧にお答えください。\n\n` +
          `【引いたカード】\n` + drawnCardsText + `\n\n` +
          `【質問番号】${phase2QuestionIndex}問目 / 3問中\n` +
          (isLastQuestion
            ? `これが最後の質問です。回答の最後に、今日のセッションへの感謝と温かい締めくくりのメッセージを添えてください。\n`
            : ``) +
          `\n【制約条件】\n` +
          `- 引いたカードと初回鑑定の内容を踏まえて具体的に答えること\n` +
          `- ${tarotist.name}として自然で温かみのある口調で答えること\n` +
          `- 占いの結果は必ずしも現実になるとは限らないことを念頭に置くこと\n` +
          `- 絵文字や顔文字を使わないこと\n` +
          `- です・ます調で話すこと\n` +
          `- 1回の回答は150文字以上250文字以内とすること\n`);

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
            console.log(`[readings/personal/route] chunk: `, chunk);
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
        logWithContext(
          "error",
          `[readings/personal/route] パーソナル占い試行${i + 1}回目失敗`,
          {
            error,
            clientId,
          }
        );
        console.error(
          `[readings/personal/route] パーソナル占い試行${i + 1}回目失敗: `,
          error
        );
        if (i === RETRY_COUNT - 1) {
          throw error;
        }
        logWithContext(
          "info",
          `[readings/personal/route] パーソナル占い再試行します ${i + 2}回目`,
          {
            clientId,
          }
        );
      }
    }
  } catch (error) {
    logWithContext("error", "[readings/personal/route] パーソナル占いエラー", {
      error,
      clientId,
    });
    return NextResponse.json(
      {
        error,
        errorMessage: "[readings/personal/route] Internal Server Error",
      },
      { status: 500 }
    );
  }
}
