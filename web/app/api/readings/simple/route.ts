import {
  DrawnCard,
  ReadingCategory,
  Spread,
  Tarotist,
} from "@/../shared/lib/types";
import { experimentalProviders } from "@/lib/server/ai/models";
import { logWithContext } from "@/lib/server/logger/logger";
import { authService, clientService } from "@/lib/server/services";
import {
  createReadingErrorResponse,
  createReadingUnexpectedErrorResponse,
  ReadingRouteError,
} from "@/lib/server/utils/reading-error";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { NextRequest } from "next/server";

const debugMode = process.env.AI_DEBUG_MODE === "true";

function mockSseResponse(text: string): Response {
  const msgId = "msg_e2e";
  const txtId = "txt_1";
  const events = [
    `data: ${JSON.stringify({ type: "start", messageId: msgId })}\n\n`,
    `data: ${JSON.stringify({ type: "start-step", stepType: "initial" })}\n\n`,
    `data: ${JSON.stringify({ type: "text-start", id: txtId })}\n\n`,
    `data: ${JSON.stringify({ type: "text-delta", id: txtId, delta: text })}\n\n`,
    `data: ${JSON.stringify({ type: "text-end", id: txtId })}\n\n`,
    `data: ${JSON.stringify({ type: "finish-step", finishReason: "stop", usage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 }, isContinued: false })}\n\n`,
    `data: ${JSON.stringify({ type: "finish", finishReason: "stop", usage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 } })}\n\n`,
    "data: [DONE]\n\n",
  ];
  return new Response(events.join(""), {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "x-vercel-ai-ui-message-stream": "v1",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

const maxOutputTokens = 65536; // これ以上は占い結果が長くなりすぎる可能性があるため制限(8192/12288/16384/65536)

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
      return createReadingErrorResponse({
        code: "UNAUTHORIZED",
        message:
          "セッションの確認に失敗しました。いったん戻って再度お試しください。",
        status: 401,
        phase: "simple",
      });
    }

    logWithContext("debug", "セッション検証完了", { payload });
    clientId = payload.payload.clientId;
    // deviceId は optional（Web ユーザーは Device を持たないケースがある）
    const deviceId = payload.payload.deviceId;
    if (!clientId) {
      logWithContext("warn", "clientId不正", { payload });
      return createReadingErrorResponse({
        code: "UNAUTHORIZED",
        message:
          "セッション情報が見つかりません。いったん戻って再度お試しください。",
        status: 401,
        phase: "simple",
      });
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

    // ✅ プラン整合性チェック: 現プランで使えないタロティストを弾く
    //   クライアント側で選択状態を保持する設計のため、サーバ側での最終防衛線として必須
    const client = await clientService.getClientById(clientId);
    if (!client || !client.plan) {
      logWithContext("warn", "クライアントまたはプランが見つからない", { clientId });
      return createReadingErrorResponse({
        code: "UNAUTHORIZED",
        message:
          "アカウント情報の取得に失敗しました。いったん戻って再度お試しください。",
        status: 401,
        phase: "simple",
      });
    }
    if (tarotist?.plan && tarotist.plan.no > client.plan.no) {
      logWithContext("warn", "プラン不足のタロティスト利用を拒否", {
        clientId,
        tarotistId: tarotist.id,
        tarotistPlan: tarotist.plan.code,
        clientPlan: client.plan.code,
      });
      return createReadingErrorResponse({
        code: "PLAN_INSUFFICIENT",
        message:
          "この占い師は現在のプランではご利用いただけません。プランをアップグレードするか、別の占い師をお選びください。",
        status: 403,
        phase: "simple",
      });
    }

    // ── E2E モックモード ──────────────────────────────────────
    // E2E_MOCK_AI=true のとき AI を呼ばず保存ロジックだけ実行してモック SSE を返す
    if (process.env.E2E_MOCK_AI === "true") {
      const mockText = "E2Eテスト用モックレスポンスです。";
      const msgTextFn = (m: UIMessage) =>
        m.parts
          .filter((p) => p.type === "text")
          .map((p) => (p as { text: string }).text)
          .join("");
      const chatMessages = [
        ...clientMessages.map((msg) => ({
          clientId,
          tarotistId: tarotist.id,
          tarotist,
          chatType: msg.role === "user" ? ("USER_QUESTION" as const) : ("FINAL_READING" as const),
          role: msg.role === "user" ? ("USER" as const) : ("TAROTIST" as const),
          message: msgTextFn(msg),
        })),
        {
          clientId,
          tarotistId: tarotist.id,
          tarotist,
          chatType: "FINAL_READING" as const,
          role: "TAROTIST" as const,
          message: mockText,
        },
      ];
      try {
        await clientService.saveReading({
          clientId,
          deviceId,
          tarotistId: tarotist.id,
          tarotist,
          spreadId: spread.id,
          spread,
          categoryId: category?.id ?? null,
          category: category ?? undefined,
          cards: drawnCards,
          chatMessages,
          incrementUsage: true,
        });
        logWithContext("info", "E2E モック: クイック占い保存完了", { clientId });
      } catch (error) {
        logWithContext("error", "E2E モック: クイック占い保存に失敗", { error, clientId });
      }
      return mockSseResponse(mockText);
    }

    // ✅ 最初のメッセージ（占い開始時）のみ残回数チェック
    //    以降のターンは saveReading でカウントするためここでは初回のみ制限
    //    debugMode=true の場合は制限をスキップ
    if (!debugMode && clientMessages.length === 1) {
      const usage = await clientService.getUsageAndReset(clientId);
      if (usage.remainingReadings <= 0) {
        logWithContext("warn", "クイック占い回数上限", { clientId });
        return createReadingErrorResponse({
          code: "LIMIT_REACHED",
          message: "本日のクイック占い回数上限に達しました。",
          status: 429,
          phase: "simple",
        });
      }
    }

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
                }`,
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
      `- 回答は必ず一回で完結させること。複数回に分けて回答しないこと\n` +
      `- 1回の回答は200文字以上300文字以内とすること\n`;

    logWithContext("debug", "シンプル占いリクエストボディ受信", {
      tarotistId: tarotist?.id,
      spreadId: spread?.id,
      categoryId: category?.id,
      drawnCardsCount: drawnCards?.length,
      messagesCount: clientMessages?.length,
      debugMode,
      provider,
    });

    const messages: Awaited<ReturnType<typeof convertToModelMessages>> =
      await convertToModelMessages(clientMessages);

    for (let i = 0; i < RETRY_COUNT; i++) {
      try {
        logWithContext("info", "システムプロンプトとメッセージ変換完了", {
          clientId,
        });
        // 実験的になるが、しばらくは無料プロバイダを中心にしつつ、claude, gpt を含めるリトライ構成とする
        const model =
          i === 0
            ? experimentalProviders["primary"]
            : i === 1
              ? experimentalProviders["secondary"]
              : experimentalProviders["tertiary"];
        const result = streamText({
          model,
          messages:
            messages.length > 0 ? messages : [{ role: "user", content: "" }],
          system,
          maxOutputTokens,
          // streamText.onFinish はモデルの生成完了時点で発火する（クライアント切断に左右されない）。
          // toUIMessageStreamResponse.onFinish はクライアントがストリームを全て読み終えた後に発火するため、
          // モバイルが SSE 読み取り完了後に接続を閉じると isAborted=true になり回数が加算されなかった。
          onFinish: async ({ text, finishReason }) => {
            logWithContext("info", "クイック占い streamText.onFinish 発火", {
              clientId,
              textLength: text.length,
              finishReason,
            });

            if (!text.trim() || finishReason === "error") {
              logWithContext("warn", "クイック占い: テキスト空またはエラー終了のためスキップ", {
                clientId,
                textLength: text.length,
                finishReason,
              });
              return;
            }

            try {
              const msgText = (m: UIMessage) =>
                m.parts
                  .filter((p) => p.type === "text")
                  .map((p) => (p as { text: string }).text)
                  .join("");
              const chatMessages = [
                ...clientMessages.map((msg) => ({
                  clientId,
                  tarotistId: tarotist.id,
                  tarotist,
                  chatType: msg.role === "user" ? ("USER_QUESTION" as const) : ("FINAL_READING" as const),
                  role: msg.role === "user" ? ("USER" as const) : ("TAROTIST" as const),
                  message: msgText(msg),
                })),
                {
                  clientId,
                  tarotistId: tarotist.id,
                  tarotist,
                  chatType: "FINAL_READING" as const,
                  role: "TAROTIST" as const,
                  message: text,
                },
              ];
              await clientService.saveReading({
                clientId,
                deviceId,
                tarotistId: tarotist.id,
                tarotist,
                spreadId: spread.id,
                spread,
                categoryId: category?.id ?? null,
                category: category ?? undefined,
                cards: drawnCards,
                chatMessages,
                incrementUsage: true,
              });
              logWithContext("info", "クイック占い保存完了", { clientId });
            } catch (error) {
              logWithContext("error", "クイック占い保存に失敗", {
                error,
                errorName: error instanceof Error ? error.name : typeof error,
                errorMessage: error instanceof Error ? error.message : String(error),
                clientId,
              });
            }
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
          `[readings/simple/route] シンプル占い試行${i + 1}回目失敗`,
          { error, clientId },
        );
        if (i === RETRY_COUNT - 1) {
          throw new ReadingRouteError({
            code: "PROVIDER_TEMPORARY_FAILURE",
            message:
              "ただいま占いが混み合っています。少し時間をおいてもう一度お試しください。",
            status: 503,
            phase: "simple",
            retryable: true,
          });
        }
        const nextModel = i === 0 ? "gpt5nano" : "claude_h";
        logWithContext(
          "warn",
          `[readings/simple/route] プロバイダ失敗、${nextModel} にフォールバック (${i + 2}回目)`,
          { clientId },
        );
      }
    }
  } catch (error) {
    logWithContext("error", "[readings/simple/route] シンプル占いエラー", {
      error,
      clientId,
    });
    return createReadingUnexpectedErrorResponse(error, {
      code: "INTERNAL_ERROR",
      message: "占いの開始に失敗しました。時間をおいてもう一度お試しください。",
      status: 500,
      phase: "simple",
    });
  }
}
