import { XPostPhase, XPostStatus, XPostType } from "@/lib/generated/prisma/client";
import { BlogPostType } from "@/lib/generated/prisma/client";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { xPostRepository, xPostConfigRepository, type XPostRow } from "@/lib/server/repositories/x-post";
import { blogPostRepository, type BlogPostRow } from "@/lib/server/repositories/blog-post";
import { tarotRepository } from "@/lib/server/repositories/tarot";
import { postTweet, isTwitterConfigured } from "./twitter";
import logger from "@/lib/server/logger/logger";

const APP_URL = process.env.AUTH_URL ?? "https://ariadne-ai.app";
const PRE_LAUNCH_CTA_URL = `${APP_URL}/download`;

export type GeneratedContent = {
  text: string;
  mediaPath?: string | null;
  linkedBlogPostId?: string | null;
};

function getGenerationModel() {
  return anthropic("claude-haiku-4-5");
}

function resolveCardMediaPath(code: string, isReversed: boolean): string {
  const dir = isReversed ? "cards-reversed" : "cards";
  return `/${dir}/${code}.png`;
}

function ensurePositionInText(text: string, cardName: string, isReversed: boolean): string {
  const position = isReversed ? "逆位置" : "正位置";
  if (text.includes(position)) return text;
  return `【${cardName}（${position}）】\n${text}`;
}

// ==========================================
// ブログ記事からXティーザー生成
// ==========================================
export async function generateFromBlogPost(
  blogPost: BlogPostRow,
  xType: XPostType,
): Promise<GeneratedContent> {
  const blogUrl = `${APP_URL}/blog/${blogPost.slug}`;

  let mediaPath: string | null = null;

  // DAILY_CARDはブログのカード情報からメディアパスを解決
  if (xType === XPostType.DAILY_CARD && blogPost.prompt) {
    try {
      const meta = JSON.parse(blogPost.prompt) as { cardCode?: string; isReversed?: boolean };
      if (meta.cardCode) {
        mediaPath = resolveCardMediaPath(meta.cardCode, meta.isReversed ?? false);
      }
    } catch {
      // パース失敗時はメディアなし
    }
  }

  const typeInstruction = xType === XPostType.DAILY_CARD
    ? "今日の一枚として読者の感情・状況に寄り添う内容にし、カード名と正逆位置を冒頭に明記してください。"
    : xType === XPostType.BUILD_IN_PUBLIC || xType === XPostType.APP_PROMO
    ? "Ariadne公式からの告知として、読者が「使ってみたい・試してみたい」と感じる内容にしてください。"
    : "読者が「面白い・タロットに興味が湧く」と感じる内容にしてください。";

  const { text } = await generateText({
    model: getGenerationModel(),
    system: `あなたはAriadne AIタロット占いの公式X(Twitter)担当です。
ブログ記事を元に140文字以内のX投稿を作成します。絵文字を適切に使ってください。`,
    prompt: `以下のブログ記事を元に、X投稿を作成してください。

【ブログ記事タイトル】${blogPost.title}
【記事の概要】${blogPost.excerpt ?? blogPost.content.slice(0, 200)}

${typeInstruction}
末尾にブログURLを含めてください: ${blogUrl}
ハッシュタグ「#タロット #Ariadne」を付けてください。
本文 + URL + ハッシュタグ合わせて140文字以内に収めてください。`,
    maxOutputTokens: 300,
  });

  return { text: text.trim(), mediaPath, linkedBlogPostId: blogPost.id };
}

// ==========================================
// 独立生成（フォールバック・ブログなしの場合）
// ==========================================
export async function generateContent(
  type: XPostType,
  phase: XPostPhase = XPostPhase.POST_LAUNCH,
  customPrompt?: string,
): Promise<GeneratedContent> {
  const isPreLaunch = phase === XPostPhase.PRE_LAUNCH;

  if (customPrompt) {
    const { text } = await generateText({
      model: getGenerationModel(),
      system: `あなたはAriadne AIタロット占いの公式X(Twitter)担当です。
投稿は必ず140文字以内（ハッシュタグ含む）にしてください。絵文字を適切に使ってください。`,
      prompt: customPrompt,
      maxOutputTokens: 300,
    });
    return { text: text.trim() };
  }

  if (type === XPostType.DAILY_CARD) {
    const cards = await tarotRepository.getAllCards(false, "ja");
    if (cards.length === 0) throw new Error("タロットカードが見つかりません");

    const card = cards[Math.floor(Math.random() * cards.length)];
    const isReversed = Math.random() < 0.3;
    const position = isReversed ? "逆位置" : "正位置";
    const mediaPath = resolveCardMediaPath(card.code, isReversed);

    const ctaLine = isPreLaunch
      ? `末尾に URL 「${PRE_LAUNCH_CTA_URL}」を入れ、最後にハッシュタグ「#タロット #今日のタロット」を付けてください。`
      : `末尾にハッシュタグ「#タロット #今日のタロット」を付けてください。`;

    const { text } = await generateText({
      model: getGenerationModel(),
      system: `あなたはAriadne AIタロット占いの公式X(Twitter)担当です。
毎日のタロットカードを紹介するX投稿を日本語で作成します。
投稿は必ず140文字以内（ハッシュタグ・URL含む）にしてください。絵文字を適切に使ってください。
本文の冒頭に必ず「${position}」と明記してください。`,
      prompt: `今日のカード「${card.name}（${position}）」の投稿を作成してください。
「〇〇と感じているなら、今日のカードはこう伝えています」という形で、読者が自分ごとに引き寄せて読めるよう書いてください。
${ctaLine}`,
      maxOutputTokens: 300,
    });

    const finalText = ensurePositionInText(text.trim(), card.name, isReversed);
    return { text: finalText, mediaPath };
  }

  if (type === XPostType.TAROT_TIP) {
    const ctaLine = isPreLaunch
      ? `末尾に URL 「${PRE_LAUNCH_CTA_URL}」を入れ、最後にハッシュタグ「#タロット #タロット豆知識」を付けてください。`
      : `末尾にハッシュタグ「#タロット #タロット豆知識」を付けてください。`;

    const { text } = await generateText({
      model: getGenerationModel(),
      system: `あなたはAriadne AIタロット占いの公式X(Twitter)担当です。
タロットの豆知識をX(Twitter)に投稿します。
投稿は必ず140文字以内（ハッシュタグ・URL含む）にしてください。絵文字を適切に使ってください。`,
      prompt: `タロットに関する「え、そうだったの？」という驚きの一文から始まる豆知識投稿を作成してください。
読んだ人がタロットに興味を持てるような内容にしてください。
${ctaLine}`,
      maxOutputTokens: 300,
    });
    return { text: text.trim() };
  }

  if (type === XPostType.APP_PROMO) {
    if (isPreLaunch) {
      const { text } = await generateText({
        model: getGenerationModel(),
        system: `あなたはAriadne AIタロット占いの公式X(Twitter)担当です。
アプリはまだ未公開（近日公開予定）で、現在リリース通知登録を受付中です。
投稿は必ず140文字以内（ハッシュタグ・URL含む）にしてください。絵文字を適切に使ってください。`,
        prompt: `「こんな気持ちのとき、ありませんか？」という共感から入り、Ariadne AIタロットをその答えとして紹介するティーザーツイートを作成してください。
App Store / Google Play のリンクは含めないでください（まだ公開されていません）。
末尾に URL 「${PRE_LAUNCH_CTA_URL}」を入れ、最後にハッシュタグ「#タロット占い #AI占い #Ariadne #近日公開」を付けてください。`,
        maxOutputTokens: 300,
      });
      return { text: text.trim() };
    } else {
      const { text } = await generateText({
        model: getGenerationModel(),
        system: `あなたはAriadne AIタロット占いの公式X(Twitter)担当です。
アプリのX(Twitter)投稿を日本語で作成します。投稿は必ず140文字以内にしてください。絵文字を適切に使ってください。`,
        prompt: `「こんな気持ちのとき、ありませんか？」という共感から入り、Ariadne AIタロットでその気持ちに向き合える旨を伝えるツイートを作成してください。
末尾に「#タロット占い #AI占い #Ariadne」を付けてください。`,
        maxOutputTokens: 300,
      });
      return { text: text.trim() };
    }
  }

  if (type === XPostType.BUILD_IN_PUBLIC) {
    const ctaLine = isPreLaunch
      ? `末尾に URL 「${APP_URL}」を入れ、最後にハッシュタグ「#Ariadne #AIタロット」を付けてください。`
      : `末尾にハッシュタグ「#Ariadne #AIタロット」を付けてください。`;

    const { text } = await generateText({
      model: getGenerationModel(),
      system: `あなたはAriadne AIタロット占いの公式X(Twitter)担当です。
アプリの新機能・改善をユーザーへお知らせするX投稿を作成します。
投稿は必ず140文字以内にしてください。絵文字を適切に使ってください。`,
      prompt: `Ariadneの新機能・改善についてユーザーへのお知らせ投稿を作成してください。
「〇〇がより使いやすくなりました」「新しく〇〇ができるようになりました」というユーザー目線の告知スタイルで書いてください。
${ctaLine}`,
      maxOutputTokens: 300,
    });
    return { text: text.trim() };
  }

  throw new Error(`自動生成非対応の投稿タイプ: ${type}`);
}

// ==========================================
// 1日3投稿をブログ連動で生成
// ==========================================
export async function createDailyXPosts(
  phase: XPostPhase,
): Promise<{ dailyCard: XPostRow; tarotTip: XPostRow; feature: XPostRow }> {
  const today = new Date();

  // ブログ記事を参照（見つからなければ独立生成）
  const [blogDailyCard, blogTarotTip, blogFeature] = await Promise.all([
    blogPostRepository.findByTypeAndDate(BlogPostType.DAILY_CARD, today),
    blogPostRepository.findByTypeAndDate(BlogPostType.TAROT_TIP, today),
    (async () => {
      const isPreLaunch = phase === XPostPhase.PRE_LAUNCH;
      return isPreLaunch
        ? blogPostRepository.findByTypeAndDate(BlogPostType.BUILD_IN_PUBLIC, today)
        : blogPostRepository.findByTypeAndDate(BlogPostType.APP_PROMO, today);
    })(),
  ]);

  const isPreLaunch = phase === XPostPhase.PRE_LAUNCH;
  const featureXType = isPreLaunch ? XPostType.BUILD_IN_PUBLIC : XPostType.APP_PROMO;
  const xPhase = phase as unknown as XPostPhase;

  const [dailyCardContent, tarotTipContent, featureContent] = await Promise.all([
    blogDailyCard
      ? generateFromBlogPost(blogDailyCard, XPostType.DAILY_CARD)
      : generateContent(XPostType.DAILY_CARD, xPhase),
    blogTarotTip
      ? generateFromBlogPost(blogTarotTip, XPostType.TAROT_TIP)
      : generateContent(XPostType.TAROT_TIP, xPhase),
    blogFeature
      ? generateFromBlogPost(blogFeature, featureXType)
      : generateContent(featureXType, xPhase),
  ]);

  const [dailyCard, tarotTip, feature] = await Promise.all([
    saveXPost(dailyCardContent, XPostType.DAILY_CARD),
    saveXPost(tarotTipContent, XPostType.TAROT_TIP),
    saveXPost(featureContent, featureXType),
  ]);

  return { dailyCard, tarotTip, feature };
}

async function saveXPost(content: GeneratedContent, type: XPostType): Promise<XPostRow> {
  if (!isTwitterConfigured()) {
    const saved = await xPostRepository.create({
      content: content.text,
      postType: type,
      status: XPostStatus.DRAFT,
      isAuto: true,
      mediaPath: content.mediaPath,
      linkedBlogPostId: content.linkedBlogPostId,
    });
    logger.info("X自動投稿: Twitter未設定のため下書き保存", { id: saved.id, type });
    return saved;
  }

  const saved = await xPostRepository.create({
    content: content.text,
    postType: type,
    status: XPostStatus.DRAFT,
    isAuto: true,
    mediaPath: content.mediaPath,
    linkedBlogPostId: content.linkedBlogPostId,
  });

  await postNow(saved.id);
  const updated = await xPostRepository.findById(saved.id);
  return updated ?? saved;
}

// ==========================================
// 個別投稿（管理画面・後方互換）
// ==========================================
export async function createAutoPost(type: XPostType, phase?: XPostPhase): Promise<XPostRow> {
  const resolvedPhase = phase ?? (await xPostConfigRepository.get()).phase;
  const generated = await generateContent(type, resolvedPhase);
  return saveXPost(generated, type);
}

export async function postNow(postId: string): Promise<void> {
  const post = await xPostRepository.findById(postId);
  if (!post) throw new Error(`投稿が見つかりません: ${postId}`);
  if (post.status === XPostStatus.POSTED) throw new Error("すでに投稿済みです");
  if (!isTwitterConfigured()) throw new Error("Twitter API が設定されていません");

  try {
    const tweetId = await postTweet(post.content, post.mediaPath);
    await xPostRepository.update(postId, {
      status: XPostStatus.POSTED,
      tweetId,
      postedAt: new Date(),
      error: undefined,
    });
    logger.info("X投稿成功", { postId, tweetId, hasMedia: !!post.mediaPath });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await xPostRepository.update(postId, { status: XPostStatus.FAILED, error: message });
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
    return [XPostType.DAILY_CARD, XPostType.TAROT_TIP, XPostType.BUILD_IN_PUBLIC];
  }
  return [XPostType.DAILY_CARD, XPostType.TAROT_TIP, XPostType.APP_PROMO];
}

export { isTwitterConfigured, XPostPhase };
