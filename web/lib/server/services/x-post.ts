import { XPostPhase, XPostStatus, XPostType } from "@/lib/generated/prisma/client";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { xPostRepository, type XPostRow } from "@/lib/server/repositories/x-post";
import { tarotRepository } from "@/lib/server/repositories/tarot";
import { postTweet, isTwitterConfigured } from "./twitter";
import logger from "@/lib/server/logger/logger";

const APP_URL = process.env.AUTH_URL ?? "https://ariadne-ai.app";
const APP_STORE_URL = "https://apps.apple.com/app/id6744268823";
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.atelierflowlab.aitarotchat";

function getGenerationModel() {
  return anthropic("claude-haiku-4-5");
}

export async function generateContent(type: XPostType, customPrompt?: string): Promise<string> {
  let systemPrompt: string;
  let userPrompt: string;

  if (customPrompt) {
    systemPrompt = `あなたはAIタロット占いアプリ「Ariadne（アリアドネ）」のX(Twitter)投稿担当です。
投稿は必ず140文字以内（ハッシュタグ含む）にしてください。絵文字を適切に使ってください。`;
    userPrompt = customPrompt;
  } else if (type === XPostType.DAILY_CARD) {
    const cards = await tarotRepository.getAllCards(false, "ja");
    if (cards.length === 0) {
      throw new Error("タロットカードが見つかりません");
    }
    const card = cards[Math.floor(Math.random() * cards.length)];
    const isReversed = Math.random() < 0.3;
    const position = isReversed ? "逆位置" : "正位置";

    systemPrompt = `あなたはタロット占い師です。毎日のタロットカードを紹介するX(Twitter)投稿を日本語で作成します。
投稿は必ず140文字以内（ハッシュタグ含む）にしてください。絵文字を適切に使ってください。`;
    userPrompt = `今日のタロットカード「${card.name}（${position}）」の簡潔な紹介投稿を作成してください。
カードの意味を1〜2文で伝え、前向きなメッセージで締めてください。
末尾に「#タロット #今日のタロット」を付けてください。`;
  } else if (type === XPostType.APP_PROMO) {
    systemPrompt = `あなたはAIタロット占いアプリ「Ariadne（アリアドネ）」のマーケター兼タロット占い師です。
アプリのX(Twitter)投稿を日本語で作成します。投稿は必ず140文字以内にしてください。絵文字を適切に使ってください。`;
    userPrompt = `「Ariadne AI タロット」アプリの宣伝ツイートを作成してください。
AIが本格的なタロット占いをしてくれること、無料で始められること、iOS・Android対応であることを自然に伝えてください。
末尾に「#タロット占い #AI占い #Ariadne」を付けてください。`;
  } else if (type === XPostType.TAROT_TIP) {
    systemPrompt = `あなたはタロット占い師です。タロットに関する豆知識をX(Twitter)に投稿します。
投稿は必ず140文字以内にしてください。絵文字を適切に使ってください。`;
    userPrompt = `タロットに関する面白い豆知識や雑学を1つ紹介する投稿を作成してください。
読んだ人がタロットに興味を持てるような内容にしてください。
末尾に「#タロット #タロット豆知識」を付けてください。`;
  } else if (type === XPostType.BUILD_IN_PUBLIC) {
    systemPrompt = `あなたはAIタロット占いアプリ「Ariadne（アリアドネ）」を個人開発しているエンジニアです。
開発の進捗や学びをX(Twitter)で #buildinpublic としてシェアします。
投稿は必ず140文字以内にしてください。技術的な内容を親しみやすく伝えてください。絵文字を適切に使ってください。`;
    userPrompt = `今日の開発進捗や気づきを1つ投稿してください。
例：新機能の実装、バグ修正の学び、設計の工夫、ユーザー体験の改善など。
末尾に「#buildinpublic #個人開発 #タロット」を付けてください。`;
  } else {
    throw new Error(`自動生成非対応の投稿タイプ: ${type}`);
  }

  const { text } = await generateText({
    model: getGenerationModel(),
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 300,
  });

  return text.trim();
}

export async function postNow(postId: string): Promise<void> {
  const post = await xPostRepository.findById(postId);
  if (!post) {
    throw new Error(`投稿が見つかりません: ${postId}`);
  }
  if (post.status === XPostStatus.POSTED) {
    throw new Error("すでに投稿済みです");
  }
  if (!isTwitterConfigured()) {
    throw new Error("Twitter API が設定されていません");
  }

  try {
    const tweetId = await postTweet(post.content);
    await xPostRepository.update(postId, {
      status: XPostStatus.POSTED,
      tweetId,
      postedAt: new Date(),
      error: undefined,
    });
    logger.info("X投稿成功", { postId, tweetId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await xPostRepository.update(postId, {
      status: XPostStatus.FAILED,
      error: message,
    });
    logger.error("X投稿失敗", { postId, error: message });
    throw err;
  }
}

export async function processDue(): Promise<{ posted: number; failed: number }> {
  const due = await xPostRepository.findDue();
  let posted = 0;
  let failed = 0;

  for (const post of due) {
    try {
      await postNow(post.id);
      posted++;
    } catch {
      failed++;
    }
  }

  return { posted, failed };
}

export function getAutoPostTypesForPhase(phase: XPostPhase): XPostType[] {
  if (phase === XPostPhase.PRE_LAUNCH) {
    return [XPostType.BUILD_IN_PUBLIC, XPostType.TAROT_TIP];
  }
  return [XPostType.DAILY_CARD, XPostType.TAROT_TIP, XPostType.APP_PROMO];
}

export async function createAutoPost(type: XPostType): Promise<XPostRow> {
  const content = await generateContent(type);

  if (!isTwitterConfigured()) {
    const saved = await xPostRepository.create({
      content,
      postType: type,
      status: XPostStatus.DRAFT,
      isAuto: true,
    });
    logger.info("X自動投稿: Twitter未設定のため下書き保存", { id: saved.id, type });
    return saved;
  }

  const saved = await xPostRepository.create({
    content,
    postType: type,
    status: XPostStatus.DRAFT,
    isAuto: true,
  });

  await postNow(saved.id);

  const updated = await xPostRepository.findById(saved.id);
  return updated ?? saved;
}

export { isTwitterConfigured, XPostPhase };
