// app/api/readings/personal/route.ts

import { DrawnCard, Spread, Tarotist } from "@/../shared/lib/types";
import { experimentalProviders } from "@/lib/server/ai/models";
import { logWithContext } from "@/lib/server/logger/logger";
import { readingRepository } from "@/lib/server/repositories";
import { clientService, spreadService } from "@/lib/server/services";
import { authService } from "@/lib/server/services/auth";
import { moderatePersonalQuestion } from "@/lib/server/services/moderation";
import {
  createReadingErrorResponse,
  createReadingUnexpectedErrorResponse,
  ReadingRouteError,
} from "@/lib/server/utils/reading-error";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { NextRequest } from "next/server";

const debugMode = process.env.AI_DEBUG_MODE === "true";

const maxOutputTokens = 65536; // これ以上は占い結果が長くなりすぎる可能性があるため制限(8192/12288/16384/65536)

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RETRY_COUNT = 3;

const moderationCheckerAvailable = false; // 一旦モデレーションチェックは無効化（2026-04-12）※有効にする場合は true に変更

export async function POST(req: NextRequest) {
  let clientId = "";
  let phase: "personal-intake" | "personal-reading" = "personal-intake";
  try {
    logWithContext("info", "パーソナル占いリクエスト開始", {
      path: "/api/readings/personal",
    });

    // sessionチェック（独自トークン検証）
    const payload = await authService.verifyApiRequest(req);
    if ("error" in payload || !payload) {
      logWithContext("warn", "認証失敗", { path: "/api/readings/personal" });
      return createReadingErrorResponse({
        code: "UNAUTHORIZED",
        message:
          "セッションの確認に失敗しました。いったん戻って再度お試しください。",
        status: 401,
        phase,
      });
    }

    logWithContext("debug", "セッション検証完了", { payload });
    clientId = payload.payload.clientId;
    const deviceId = payload.payload.deviceId;
    if (!clientId || !deviceId) {
      logWithContext("warn", "clientId不正", { payload });
      return createReadingErrorResponse({
        code: "UNAUTHORIZED",
        message:
          "セッション情報が見つかりません。いったん戻って再度お試しください。",
        status: 401,
        phase,
      });
    }
    logWithContext("info", "Client ID確認", { clientId });

    // リクエストボディ取得
    const {
      messages: clientMessages,
      tarotist,
      spread,
      drawnCards,
      isEndingEarly,
      initialLen,
    }: {
      messages: UIMessage[];
      tarotist: Tarotist;
      spread: Spread;
      customQuestion: string;
      drawnCards: DrawnCard[];
      isEndingEarly?: boolean;
      initialLen?: number;
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
    phase = clientMessages.length <= 3 ? "personal-intake" : "personal-reading";

    // 入力バリデーション clientMessages.length === 3 のとき質問文チェック
    if (clientMessages.length === 3) {
      if (!customQuestion || customQuestion.trim().length < 5) {
        logWithContext("warn", "質問が短すぎる", {
          clientId,
          questionLength: customQuestion?.length,
        });
        return createReadingErrorResponse({
          code: "QUESTION_TOO_SHORT",
          message: "質問は5文字以上で入力してください。",
          status: 400,
          phase,
        });
      }

      if (customQuestion.trim().length > 200) {
        logWithContext("warn", "質問が長すぎる", {
          clientId,
          questionLength: customQuestion.length,
        });
        return createReadingErrorResponse({
          code: "QUESTION_TOO_LONG",
          message: "質問は200文字以内で入力してください。",
          status: 400,
          phase,
        });
      }

      // モデレーションチェック
      if (moderationCheckerAvailable) {
        logWithContext("debug", "モデレーションチェック開始", { clientId });
        const moderation = await moderatePersonalQuestion(customQuestion);

        if (!moderation.allowed) {
          logWithContext("warn", "モデレーションNG", {
            clientId,
            reason: moderation.reason,
            category: moderation.category,
          });
          return createReadingErrorResponse({
            code: "MODERATION_BLOCKED",
            message:
              moderation.message ??
              "申し訳ございません。その内容は占うことができません。",
            status: 400,
            phase,
            details: {
              reason: moderation.reason,
              category: moderation.category,
            },
          });
        }

        if (moderation.warning) {
          logWithContext("info", "モデレーション警告", {
            clientId,
            warning: moderation.warning,
          });
        }
      }
    }

    // ✅ パーソナル占いの残回数チェック（Phase2 初回鑑定開始時のみ）
    //    length <= 1: 挨拶フェーズ、length <= 3: スプレッド提案フェーズ
    //    length 4〜6: Phase2 初回鑑定フェーズ → ここで personal カウントを消費チェック
    //    length > 6: Phase2 フォローアップ質問（同一セッション継続）→ チェック不要
    //    debugMode=true の場合は制限をスキップ
    if (!debugMode && clientMessages.length > 3 && clientMessages.length <= 6) {
      const usage = await clientService.getUsageAndReset(clientId);
      if (usage.remainingPersonal <= 0) {
        logWithContext("warn", "パーソナル占いの回数上限", { clientId });
        return createReadingErrorResponse({
          code: "LIMIT_REACHED",
          message: "本日のパーソナル占いの回数上限に達しました。",
          status: 429,
          phase,
        });
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
    // ユーザーが「占いを終わる」を選択した早期終了
    const isEarlyEnd = isEndingEarly === true && clientMessages.length > 6;

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
                }`,
            )
            .join("\n")
            .trim()
        : "";

    const tarotistBase =
      `あなたは、${tarotist.title}の${tarotist.name}です。` +
      `あなたの特徴は${tarotist.trait}です。` +
      `あなたのプロフィールは${tarotist.bio}です。` +
      `また、あなたは熟練したタロット占い師です。`;

    // ─────────────────────────────────────────────────────────────────
    // システムプロンプト: メッセージ数によってフェーズを判定
    //   length <= 1 : Phase1-1 挨拶
    //   length <= 3 : Phase1-2 スプレッド提案
    //   length <= 6 : Phase2   初回鑑定（カード解釈 + Q&A招待）
    //   length > 6  : Phase2   追加質問（中間 or 最終）
    // ─────────────────────────────────────────────────────────────────
    let system: string;

    if (clientMessages.length <= 1) {
      // ──────────────────────────────────────────
      // Phase1-1: 挨拶 + 占いたいことをヒアリング
      // ──────────────────────────────────────────
      system =
        tarotistBase +
        `まずは簡単なご挨拶をして、相談者に占いたい内容を質問してください。\n\n` +
        `【回答フォーマット】\n` +
        `【ご挨拶】\n` +
        `{${tarotist.name}として簡潔な自己紹介と丁寧なご挨拶}\n\n` +
        `本日はどのようなことを占いましょうか？\n`;
    } else if (clientMessages.length <= 3) {
      // ──────────────────────────────────────────
      // Phase1-2: スプレッド提案
      // ──────────────────────────────────────────
      system =
        tarotistBase +
        `ユーザーの相談内容に対して、適したスプレッドを提案してください。\n` +
        `スプレッドは以下のリストから選んでください。\n` +
        spreads
          .map((s) => {
            const categoryNames =
              s.categories && s.categories.length > 0
                ? s.categories
                    .map((stc) => stc.category?.name)
                    .filter(Boolean)
                    .join(", ")
                : s.category;
            return `- スプレッド番号${s.no}: ${s.name}: ${s.guide}: 適したジャンル: ${categoryNames}`;
          })
          .join("\n") +
        `\n\n` +
        `【回答フォーマット】\n` +
        `【おすすめのスプレッド】\n` +
        `相談内容に合ったスプレッドを3つ提案し、それぞれの理由を説明してください。\n` +
        `各提案は以下の形式で記述してください（波括弧{}は使わないこと）。\n` +
        `No.スプレッド番号: スプレッド名: 提案理由\n\n` +
        `最後に最もおすすめの1つを選び、必ず以下の形式で記述してください。\n\n` +
        `【特におすすめのスプレッド】\n` +
        `{スプレッド番号}: {スプレッド名}\n\n` +
        `※ 【特におすすめのスプレッド】のスプレッド番号とスプレッド名は両方を波括弧{}で囲んでください\n` +
        `※ 上記リストにある正確なスプレッド番号とスプレッド名を使用してください\n` +
        `※ 例: {19}: {キャリアパス}\n`;
    } else if (clientMessages.length <= 6) {
      // ──────────────────────────────────────────
      // Phase2: 初回鑑定
      // カード解釈 + 総合結果 + Q&A招待（3回まで明示）
      // ──────────────────────────────────────────
      const cardContext =
        drawnCards.length === 0
          ? `まだカードは引かれていません。スプレッドに必要な${spread.cells!.length}枚のカードをシャッフルして引いてください。`
          : `シャッフルして引いたカードは以下の通りです。\n${drawnCardsText}`;

      system =
        tarotistBase +
        `相談者の質問「${customQuestion}」に対して、` +
        `スプレッド「${spread.name}」を使って鑑定を行ってください。\n\n` +
        `${cardContext}\n\n` +
        `【回答フォーマット】\n\n` +
        `【カードの解釈】\n` +
        `各カードについて順番に以下の形式で記述してください。\n` +
        `{枚数}枚目: {スプレッドの位置名}: {カード名}（{正位置 or 逆位置}）\n` +
        `{スプレッドの位置の意味とカードの意味を踏まえた解釈を丁寧に記述}\n` +
        `（スプレッドのカード枚数分繰り返す）\n\n` +
        `【総合的な鑑定結果】\n` +
        `全カードの解釈を踏まえて、相談内容に対する総合的な鑑定結果を丁寧に説明してください。\n\n` +
        `【ご質問をどうぞ】\n` +
        `鑑定の内容について、3回まで質問をお受けします。` +
        `カードの意味・今後の行動のヒント・気になる点など、` +
        `どんなことでも遠慮なく質問してください。` +
        `という内容を、${tarotist.name}として自分らしい温かい言葉で伝えてください。` +
        `「3回まで質問できる」という点は必ず明確に含めること（省略不可）。\n\n` +
        `【制約条件】\n` +
        `- タロットカードの意味に基づいて回答すること\n` +
        `- 相談者の質問に対して、タロットカードの意味を踏まえた上で回答すること\n` +
        `- 占いの結果は必ずしも現実になるとは限らないことを理解してもらうようにすること\n` +
        `- 絵文字や顔文字を使わないこと\n` +
        `- 相談者に寄り添い、優しく丁寧に説明すること\n` +
        `- です・ます調で話すこと\n`;
    } else if (isEarlyEnd) {
      // ──────────────────────────────────────────
      // Phase2: 早期終了（ユーザーが「占いを終わる」を選択）
      // クロージングメッセージのみ
      // ──────────────────────────────────────────
      system =
        tarotistBase +
        `先ほどの鑑定を終了します。相談者が本日の占いを終了することを選択しました。\n` +
        `引いたカードと鑑定内容を踏まえて、${tarotist.name}として温かくセッションを締めくくってください。\n\n` +
        `【引いたカード】\n${drawnCardsText}\n\n` +
        `必ず以下の要素でセッションを締めくくってください。\n` +
        `- 本日のセッションがこれで終わりであることを明確に伝える\n` +
        `- 相談者へのお礼と、前向きな励ましの言葉を添える\n` +
        `- 「またいつでもご相談ください」のような言葉で締めくくる\n` +
        `- ${tarotist.name}として温かく・明確に締めくくること（曖昧な終わり方は不可）\n\n` +
        `【制約条件】\n` +
        `- 引いたカードと初回鑑定の内容を踏まえて具体的に締めくくること\n` +
        `- ${tarotist.name}として自然で温かみのある口調で答えること\n` +
        `- 絵文字や顔文字を使わないこと\n` +
        `- です・ます調で話すこと\n`;
    } else if (!isLastQuestion) {
      // ──────────────────────────────────────────
      // Phase2: 中間質問（1〜2問目）
      // ──────────────────────────────────────────
      system =
        tarotistBase +
        `先ほどの鑑定に続き、相談者から質問（${phase2QuestionIndex}問目 / 3問中）を受けています。\n` +
        `引いたカードと鑑定内容を踏まえて、${tarotist.name}として丁寧にお答えください。\n\n` +
        `【引いたカード】\n${drawnCardsText}\n\n` +
        `【制約条件】\n` +
        `- 引いたカードと初回鑑定の内容を踏まえて具体的に答えること\n` +
        `- ${tarotist.name}として自然で温かみのある口調で答えること\n` +
        `- 占いの結果は必ずしも現実になるとは限らないことを念頭に置くこと\n` +
        `- 絵文字や顔文字を使わないこと\n` +
        `- です・ます調で話すこと\n` +
        `- 回答の末尾に残り質問回数は書かないこと（UIが別途表示するため）\n`;
    } else {
      // ──────────────────────────────────────────
      // Phase2: 最終質問（3問目）
      // 回答 + セッション終了の明確な宣言
      // ──────────────────────────────────────────
      system =
        tarotistBase +
        `先ほどの鑑定に続き、相談者から最後の質問（3問目 / 3問中）を受けています。\n` +
        `引いたカードと鑑定内容を踏まえて、${tarotist.name}として丁寧にお答えください。\n\n` +
        `【引いたカード】\n${drawnCardsText}\n\n` +
        `回答の後に、必ず以下の要素でセッション終了を宣言してください。\n` +
        `- 本日のセッションがこれで終わりであることを明確に伝える\n` +
        `- 相談者へのお礼と、前向きな励ましの言葉を添える\n` +
        `- 「またいつでもご相談ください」のような言葉で締めくくる\n` +
        `- ${tarotist.name}として温かく・明確に締めくくること（曖昧な終わり方は不可）\n\n` +
        `【制約条件】\n` +
        `- 引いたカードと初回鑑定の内容を踏まえて具体的に答えること\n` +
        `- ${tarotist.name}として自然で温かみのある口調で答えること\n` +
        `- 占いの結果は必ずしも現実になるとは限らないことを念頭に置くこと\n` +
        `- 絵文字や顔文字を使わないこと\n` +
        `- です・ます調で話すこと\n`;
    }

    logWithContext("debug", "パーソナル占いリクエストボディ受信", {
      tarotistId: tarotist?.id,
      spreadId: spread?.id,
      drawnCardsCount: drawnCards?.length,
      messagesCount: clientMessages?.length,
      phase,
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
          onFinish: async ({ text, finishReason }) => {
            logWithContext("info", "パーソナル占い streamText.onFinish 発火", {
              clientId,
              textLength: text.length,
              finishReason,
              messagesCount: clientMessages.length,
            });

            if (!text.trim() || finishReason === "error") {
              logWithContext("warn", "パーソナル占い: テキスト空またはエラー終了のためスキップ", {
                clientId,
                textLength: text.length,
                finishReason,
              });
              return;
            }

            // Phase1 (長さ<=3) は保存しない
            if (clientMessages.length <= 3) return;

            const msgText = (m: UIMessage) =>
              m.parts
                .filter((p) => p.type === "text")
                .map((p) => (p as { text: string }).text)
                .join("");

            try {
              if (clientMessages.length <= 6) {
                // Phase2 初回鑑定: 新規作成 + 利用回数消費
                const chatMessages = [
                  ...clientMessages.map((msg) => ({
                    tarotistId: tarotist.id,
                    tarotist,
                    chatType: msg.role === "user" ? ("USER_QUESTION" as const) : ("TAROTIST_ANSWER" as const),
                    role: msg.role === "user" ? ("USER" as const) : ("TAROTIST" as const),
                    message: msgText(msg),
                  })),
                  {
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
                  customQuestion: customQuestion ?? "",
                  cards: drawnCards,
                  chatMessages,
                  incrementUsage: true,
                });
                logWithContext("info", "パーソナル占い Phase2 初回鑑定保存完了", { clientId });
              } else {
                // Q&A ターン: 既存リーディングを更新
                const existingReading = await readingRepository.getLatestPersonalReadingForClient(clientId);
                if (!existingReading) {
                  logWithContext("warn", "パーソナル占い Q&A: 既存リーディングが見つかりません", { clientId });
                  return;
                }

                const firstPhase2AiIdx = clientMessages.findIndex(
                  (m, i) => m.role === "assistant" && i >= (initialLen ?? 0),
                );
                const chatMessages = [
                  ...clientMessages.map((msg, i) => ({
                    tarotistId: tarotist.id,
                    tarotist,
                    chatType:
                      msg.role === "user"
                        ? ("USER_QUESTION" as const)
                        : i === firstPhase2AiIdx
                          ? ("FINAL_READING" as const)
                          : ("TAROTIST_ANSWER" as const),
                    role: msg.role === "user" ? ("USER" as const) : ("TAROTIST" as const),
                    message: msgText(msg),
                  })),
                  {
                    tarotistId: tarotist.id,
                    tarotist,
                    chatType: "TAROTIST_ANSWER" as const,
                    role: "TAROTIST" as const,
                    message: text,
                  },
                ];
                await clientService.saveReading({
                  readingId: existingReading.id,
                  clientId,
                  deviceId,
                  tarotistId: tarotist.id,
                  tarotist,
                  spreadId: spread.id,
                  spread,
                  customQuestion: customQuestion ?? "",
                  cards: drawnCards,
                  chatMessages,
                  incrementUsage: false,
                });
                logWithContext("info", "パーソナル占い Q&A 保存完了", { clientId, readingId: existingReading.id });
              }
            } catch (error) {
              logWithContext("error", "パーソナル占い保存に失敗", {
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
          `[readings/personal/route] パーソナル占い試行${i + 1}回目失敗`,
          { error, clientId },
        );
        if (i === RETRY_COUNT - 1) {
          throw new ReadingRouteError({
            code: "PROVIDER_TEMPORARY_FAILURE",
            message:
              "ただいま占いが混み合っています。少し時間をおいてもう一度お試しください。",
            status: 503,
            phase,
            retryable: true,
          });
        }
        const nextModel = i === 0 ? "gpt5nano" : "claude_h";
        logWithContext(
          "warn",
          `[readings/personal/route] プロバイダ失敗、${nextModel} にフォールバック (${i + 2}回目)`,
          { clientId },
        );
      }
    }
  } catch (error) {
    logWithContext("error", "[readings/personal/route] パーソナル占いエラー", {
      error,
      clientId,
    });
    return createReadingUnexpectedErrorResponse(error, {
      code: "INTERNAL_ERROR",
      message:
        phase === "personal-intake"
          ? "パーソナル占いの準備に失敗しました。時間をおいてもう一度お試しください。"
          : "パーソナル占いの鑑定に失敗しました。時間をおいてもう一度お試しください。",
      status: 500,
      phase,
    });
  }
}
