// lib/services/moderationService.ts

import { checkNgWords, checkWarnings } from "@/lib/server/validators/ng-words";

export async function moderatePersonalQuestion(question: string) {
  // 1. 自社NGワードチェック（タロットスコープ外）
  const ngWordResult = checkNgWords(question);
  if (!ngWordResult.isAllowed) {
    return {
      allowed: false,
      reason: "out_of_scope",
      category: ngWordResult.category,
      message: ngWordResult.message,
      severity: "medium",
    };
  }

  // 2. OpenAI Moderation API（暴力・自傷・性的など）
  try {
    const openaiResult = await checkWithOpenAI(question);

    if (openaiResult.flagged) {
      // 深刻なカテゴリ
      if (
        openaiResult.categories["self-harm"] ||
        openaiResult.categories["self-harm/intent"] ||
        openaiResult.categories["self-harm/instructions"]
      ) {
        return {
          allowed: false,
          reason: "self_harm",
          message:
            "深刻なお悩みのようでしたら、専門の相談窓口にご連絡ください。\n\nいのちの電話: 0570-783-556",
          severity: "critical",
        };
      }

      if (
        openaiResult.categories["violence"] ||
        openaiResult.categories["violence/graphic"]
      ) {
        return {
          allowed: false,
          reason: "violence",
          message: "申し訳ございません。その内容は占うことができません。",
          severity: "high",
        };
      }

      if (
        openaiResult.categories["sexual"] ||
        openaiResult.categories["sexual/minors"]
      ) {
        return {
          allowed: false,
          reason: "sexual",
          message: "申し訳ございません。その内容は占うことができません。",
          severity: "high",
        };
      }

      if (
        openaiResult.categories["hate"] ||
        openaiResult.categories["hate/threatening"]
      ) {
        return {
          allowed: false,
          reason: "hate",
          message: "申し訳ございません。その内容は占うことができません。",
          severity: "high",
        };
      }
    }

    // 3. 警告チェック（ブロックはしないが、ユーザーに確認）
    const warning = checkWarnings(question);

    return {
      allowed: true,
      warning: warning || undefined,
    };
  } catch (error) {
    console.error("OpenAI Moderation API error:", error);

    // OpenAI APIがエラーでも、NGワードチェックは通過したのでOK
    return {
      allowed: true,
      warning: "モデレーションサービスが一時的に利用できません",
    };
  }
}

// OpenAI Moderation API呼び出し
async function checkWithOpenAI(text: string) {
  // TODO: fetchを共通化する
  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: text,
      model: "text-moderation-latest", // 最新モデル
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI Moderation API failed");
  }

  const data = await response.json();
  return data.results[0];
}
