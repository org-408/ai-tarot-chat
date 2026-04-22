import { BlogPostPhase, BlogPostStatus, BlogPostType } from "@/lib/generated/prisma/client";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  blogPostRepository,
  blogPostConfigRepository,
  blogFeatureQueueRepository,
  type BlogPostRow,
} from "@/lib/server/repositories/blog-post";
import { tarotRepository } from "@/lib/server/repositories/tarot";
import logger from "@/lib/server/logger/logger";

const APP_URL = process.env.AUTH_URL ?? "https://ariadne-ai.app";
const PRE_LAUNCH_CTA_URL = `${APP_URL}/download`;

// アプリスクリーンショット（タイプ別カバー画像候補）
const COVER_IMAGES: Record<string, string[]> = {
  DAILY_CARD: [],  // カード画像を動的にセット
  TAROT_GUIDE: [
    "/blog/screenshots/spread.png",
    "/blog/screenshots/reading.png",
  ],
  TAROT_TIP: [
    "/blog/screenshots/home.png",
    "/blog/screenshots/tarotist.png",
  ],
  APP_PROMO: [
    "/blog/screenshots/home.png",
    "/blog/screenshots/tarotist.png",
    "/blog/screenshots/reading.png",
  ],
  BUILD_IN_PUBLIC: [
    "/blog/screenshots/home.png",
    "/blog/screenshots/reading.png",
  ],
};

function getBlogModel() {
  return anthropic("claude-sonnet-4-6");
}

function sanitizeSlug(rawSlug: string): string {
  return rawSlug
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
}

function buildSlug(aiSlug: string | null | undefined, suffix?: string): string {
  const timestamp = Date.now();
  const base = suffix ?? String(timestamp);
  if (aiSlug) {
    const sanitized = sanitizeSlug(aiSlug);
    if (sanitized) return `${sanitized}-${base}`;
  }
  return `post-${base}`;
}

function formatDateJa(date: Date): string {
  return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

export type GenerateBlogPostResult = {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  tags: string[];
  coverImageUrl: string | null;
  metaExtracted: boolean;
  cardCode?: string;
  isReversed?: boolean;
};

const JSON_SUFFIX = `最後に必ず記事本文のあとに以下のJSONだけを出力してください:
{"title": "記事タイトル", "slug": "english-slug-in-kebab-case", "excerpt": "120文字以内の概要", "metaDescription": "160文字以内のSEO用説明", "tags": ["タグ1", "タグ2", "タグ3"]}

slug は ASCII 英小文字・数字・ハイフンのみで 50 文字以内。URL に使うため記事内容を表す英単語を 3〜6 語ハイフン区切りで表現してください（例: "tarot-major-arcana-guide", "how-to-read-tarot-cards"）。`;

function parseGeneratedText(text: string): {
  meta: { title?: string; slug?: string; excerpt?: string; metaDescription?: string; tags?: string[] };
  content: string;
  metaExtracted: boolean;
} {
  const jsonMatches = [...text.matchAll(/\{[\s\S]*?"title"[\s\S]*?\}/g)];
  const jsonMatch = jsonMatches.at(-1);
  let meta: { title?: string; slug?: string; excerpt?: string; metaDescription?: string; tags?: string[] } = {};
  let content = text;
  let metaExtracted = false;

  if (jsonMatch) {
    try {
      meta = JSON.parse(jsonMatch[0]);
      if (meta.title) {
        content = text.slice(0, text.lastIndexOf(jsonMatch[0])).trim();
        metaExtracted = true;
      }
    } catch {
      // JSON解析失敗時はそのまま
    }
  }
  return { meta, content, metaExtracted };
}

// ==========================================
// DAILY_CARD
// ==========================================
export async function generateDailyCardContent(date: Date): Promise<GenerateBlogPostResult> {
  const cards = await tarotRepository.getAllCards(false, "ja");
  if (cards.length === 0) throw new Error("タロットカードが見つかりません");

  const card = cards[Math.floor(Math.random() * cards.length)];
  const isReversed = Math.random() < 0.3;
  const position = isReversed ? "逆位置" : "正位置";
  const dateStr = formatDateJa(date);
  const dateSlug = date.toISOString().slice(0, 10).replace(/-/g, "");

  const disclaimer = `\n\n---\n※ 毎日新しいカードを引いています。同じカードが続けて登場することがあります。詳しい占いは [Ariadne AIタロット占い](${APP_URL}) でお試しください。`;

  const { text } = await generateText({
    model: getBlogModel(),
    system: `あなたはAriadne AIタロット占いの公式ブログライターです。
毎日のタロットカードの簡易リーディングを日本語で書きます。
記事はMarkdown形式・600〜800文字程度。見出し(##)を使い、読者が自分ごととして読める内容にしてください。`,
    prompt: `今日（${dateStr}）のタロットカード「${card.name}（${position}）」の簡易リーディング記事を書いてください。

## 記事構成
## はじめに（このカードが示す今日のテーマを1文で）
## ${card.name}（${position}）が伝えること（カードの意味と今日の運勢）
## 今日のアドバイス（読者への具体的なメッセージ）

読者が「このカード、今日の自分に当てはまるかも」と感じられるよう、感情・状況に寄り添って書いてください。
占いの詳細結果はアプリで体験できる旨を末尾に自然に添えてください。

${JSON_SUFFIX}`,
    maxOutputTokens: 1500,
  });

  const { meta, content, metaExtracted } = parseGeneratedText(text);
  const tags = Array.isArray(meta.tags) && meta.tags.length > 0
    ? meta.tags
    : ["タロット", "今日の一枚", card.name];

  const title = `今日の一枚：${card.name}（${position}）— ${dateStr}`;
  const cardImagePath = isReversed ? `/cards-reversed/${card.code}.png` : `/cards/${card.code}.png`;

  return {
    title,
    slug: buildSlug(`daily-card-${card.code.replace("_", "-")}-${position === "逆位置" ? "reversed" : "upright"}`, dateSlug),
    content: (content || text) + disclaimer,
    excerpt: meta.excerpt || `${dateStr}の今日の一枚は「${card.name}（${position}）」。${text.slice(0, 80)}`,
    metaDescription: meta.metaDescription || `${dateStr}の今日のタロットカードは${card.name}（${position}）。今日のメッセージをお届けします。`,
    tags,
    coverImageUrl: cardImagePath,
    metaExtracted,
    cardCode: card.code,
    isReversed,
  };
}

// ==========================================
// TAROT_GUIDE
// ==========================================
export async function generateTarotGuideContent(recentTitles: string[]): Promise<GenerateBlogPostResult> {
  const exclusion = recentTitles.length > 0
    ? `\n\n【すでに扱ったカード・テーマ（これ以外を選んでください）】\n${recentTitles.slice(0, 20).join("\n")}`
    : "";

  const { text } = await generateText({
    model: getBlogModel(),
    system: `あなたはAriadne AIタロット占いの公式ブログライターです。
タロットカードの詳細解説記事を日本語で書きます。
記事はMarkdown形式・1200〜1800文字程度。見出し(##, ###)・箇条書き・太字を使い、SEOキーワードを自然に織り込んでください。
読者は「このカードを引いたがどう読めばいいか分からない」という状態。読み終えたら「自分でもできそう」と感じさせることを目標にしてください。`,
    prompt: `タロット78枚の中から1枚を選び、そのカードの詳細解説記事を書いてください。

## 必須の記事構成
## はじめに（読者が抱きやすい具体的な疑問・共感ポイントから始める）
## [カード名]の基本的な意味（正位置・逆位置）
## 恋愛・仕事・日常生活への読み方
## このカードが出たときのアドバイス
## まとめ（今日から使えるポイント1つ）

末尾に「[Ariadne AIタロット占い](${APP_URL}) で実際に試せます」と自然に添えてください。${exclusion}

${JSON_SUFFIX}`,
    maxOutputTokens: 2000,
  });

  const { meta, content, metaExtracted } = parseGeneratedText(text);
  const tags = Array.isArray(meta.tags) && meta.tags.length > 0
    ? meta.tags
    : ["タロット", "タロットカード", "占い"];

  return {
    title: meta.title || "タロットカード解説",
    slug: buildSlug(meta.slug),
    content: content || text,
    excerpt: meta.excerpt || text.slice(0, 120),
    metaDescription: meta.metaDescription || text.slice(0, 160),
    tags,
    coverImageUrl: null,
    metaExtracted,
  };
}

// ==========================================
// TAROT_TIP
// ==========================================
export async function generateTarotTipContent(
  phase: BlogPostPhase,
  recentTitles: string[],
): Promise<GenerateBlogPostResult> {
  const exclusion = recentTitles.length > 0
    ? `\n\n【すでに扱ったトピック（これ以外を選んでください）】\n${recentTitles.slice(0, 20).join("\n")}`
    : "";

  const ctaLine = phase === BlogPostPhase.PRE_LAUNCH
    ? `末尾に「Ariadne AIタロット占いは近日公開予定です。リリース通知の事前登録はこちらから → ${PRE_LAUNCH_CTA_URL}」を自然な形で含めてください。`
    : `末尾に「[Ariadne AIタロット占い](${APP_URL}) でタロットを体験してみてください」と自然に添えてください。`;

  const { text } = await generateText({
    model: getBlogModel(),
    system: `あなたはAriadne AIタロット占いの公式ブログライターです。
タロットの知識・文化・歴史・活用法を日本語で紹介します。
記事はMarkdown形式・800〜1200文字程度。タロットを知らない人が読んでも「へえ！」と感じ、占いが身近になるきっかけになる記事を目指してください。`,
    prompt: `タロットの知識・文化・歴史・活用法から1つトピックを選び、読み物として楽しい記事を書いてください。

## 必須の記事構成
まず「え、そうだったの？」という意外な事実・驚きの一文から始めてください（冒頭が最も重要）。
そこから自然に広げて、最後に「だからタロットは面白い・役立つ」につなげてください。

${ctaLine}${exclusion}

${JSON_SUFFIX}`,
    maxOutputTokens: 2000,
  });

  const { meta, content, metaExtracted } = parseGeneratedText(text);
  const tags = Array.isArray(meta.tags) && meta.tags.length > 0
    ? meta.tags
    : ["タロット", "占い", "タロット豆知識"];

  return {
    title: meta.title || "タロット豆知識",
    slug: buildSlug(meta.slug),
    content: content || text,
    excerpt: meta.excerpt || text.slice(0, 120),
    metaDescription: meta.metaDescription || text.slice(0, 160),
    tags,
    coverImageUrl: null,
    metaExtracted,
  };
}

// ==========================================
// APP_PROMO
// ==========================================
export async function generateAppPromoContent(recentTitles: string[]): Promise<GenerateBlogPostResult> {
  const exclusion = recentTitles.length > 0
    ? `\n\n【すでに扱ったテーマ（これ以外を選んでください）】\n${recentTitles.slice(0, 20).join("\n")}`
    : "";

  const { text } = await generateText({
    model: getBlogModel(),
    system: `あなたはAriadne AIタロット占いの公式ブログライターです。
アプリ・タロットのある生活を魅力的に紹介する記事を日本語で書きます。
記事はMarkdown形式・1000〜1500文字程度。押し売りにならず、読者の共感から入り「使ってみたい」と自然に思わせる内容を心がけてください。`,
    prompt: `以下のテーマから1つ選んで記事を書いてください：
・迷ったとき・落ち込んだとき・背中を押してほしいとき、タロットがどんな助けになるか
・朝のルーティンにタロットを取り入れるメリット
・AIタロットが人間のタロット占い師と違う点（速さ・プライバシー・いつでも使える）
・タロットのある生活でどんな変化が生まれるか

## 必須の記事構成
## はじめに（「こんな気持ちのとき、ありませんか？」という共感から始める）
## [本題：タロット・Ariadneが提供する体験や価値]
## まとめ（自然なCTAで締める）

末尾に ${APP_URL} からすぐ試せる旨を添えてください。${exclusion}

${JSON_SUFFIX}`,
    maxOutputTokens: 2000,
  });

  const { meta, content, metaExtracted } = parseGeneratedText(text);
  const tags = Array.isArray(meta.tags) && meta.tags.length > 0
    ? meta.tags
    : ["タロット", "AI占い", "Ariadne"];

  return {
    title: meta.title || "タロットのある生活",
    slug: buildSlug(meta.slug),
    content: content || text,
    excerpt: meta.excerpt || text.slice(0, 120),
    metaDescription: meta.metaDescription || text.slice(0, 160),
    tags,
    coverImageUrl: null,
    metaExtracted,
  };
}

// ==========================================
// BUILD_IN_PUBLIC（機能紹介・キューから消化）
// ==========================================
export async function generateBuildInPublicContent(
  phase: BlogPostPhase,
  featureDescription: string,
): Promise<GenerateBlogPostResult> {
  const ctaLine = phase === BlogPostPhase.PRE_LAUNCH
    ? `末尾に「Ariadne AIタロット占いは近日公開予定です。開発の進捗は [Ariadne](${APP_URL}) をご覧ください」と自然に添えてください。`
    : `末尾に ${APP_URL} から試せる旨を添えてください。`;

  const { text } = await generateText({
    model: getBlogModel(),
    system: `あなたはAriadne AIタロット占いの公式ブログライターです。
アプリの新機能・改善点をユーザー目線で紹介する記事を日本語で書きます。
記事はMarkdown形式・1000〜1500文字程度。技術用語は使わず「こんなことができるようになった」「こう使うと便利」という視点で書いてください。`,
    prompt: `以下の機能・改善について、ユーザーが「使ってみたい」と思えるブログ記事を書いてください。

【紹介する機能・改善】
${featureDescription}

## 必須の記事構成
## はじめに（この機能でどんな体験が変わるかを1文で）
## [機能名]とは（ユーザー目線で何ができるかを説明）
## こう使うと便利（具体的なシーン・使い方）
## まとめ

技術的な実装方法ではなく、ユーザーにとってどんな体験になるかを中心に書いてください。
${ctaLine}

${JSON_SUFFIX}`,
    maxOutputTokens: 2000,
  });

  const { meta, content, metaExtracted } = parseGeneratedText(text);
  const tags = Array.isArray(meta.tags) && meta.tags.length > 0
    ? meta.tags
    : ["Ariadne", "新機能", "AI占い"];

  return {
    title: meta.title || "新機能のお知らせ",
    slug: buildSlug(meta.slug),
    content: content || text,
    excerpt: meta.excerpt || text.slice(0, 120),
    metaDescription: meta.metaDescription || text.slice(0, 160),
    tags,
    coverImageUrl: null,
    metaExtracted,
  };
}

// ==========================================
// customPrompt
// ==========================================
export async function generateBlogContent(
  type: BlogPostType,
  phase: BlogPostPhase = BlogPostPhase.POST_LAUNCH,
  customPrompt?: string,
): Promise<GenerateBlogPostResult> {
  if (customPrompt) {
    const { text } = await generateText({
      model: getBlogModel(),
      system: `あなたはAriadne AIタロット占いの公式ブログライターです。
SEOに最適化された日本語のブログ記事を書きます。
記事はMarkdown形式。見出し(##, ###)・箇条書き・太字などを適切に使ってください。`,
      prompt: `${customPrompt}\n\n${JSON_SUFFIX}`,
      maxOutputTokens: 2000,
    });

    const { meta, content, metaExtracted } = parseGeneratedText(text);
    const tags = Array.isArray(meta.tags) && meta.tags.length > 0
      ? meta.tags
      : ["タロット", "占い", "Ariadne"];

    return {
      title: meta.title || "下書き記事",
      slug: buildSlug(meta.slug),
      content: content || text,
      excerpt: meta.excerpt || text.slice(0, 120),
      metaDescription: meta.metaDescription || text.slice(0, 160),
      tags,
      coverImageUrl: null,
      metaExtracted,
    };
  }

  const recentTitles = await blogPostRepository.findRecentTitles(type, 30);

  switch (type) {
    case BlogPostType.DAILY_CARD:
      return generateDailyCardContent(new Date());
    case BlogPostType.TAROT_GUIDE:
      return generateTarotGuideContent(recentTitles);
    case BlogPostType.TAROT_TIP:
      return generateTarotTipContent(phase, recentTitles);
    case BlogPostType.APP_PROMO:
      return generateAppPromoContent(recentTitles);
    case BlogPostType.BUILD_IN_PUBLIC: {
      const queued = await blogFeatureQueueRepository.findNextPending();
      if (!queued) {
        logger.warn("BUILD_IN_PUBLIC: キューが空のためスキップ");
        return generateAppPromoContent(recentTitles);
      }
      return generateBuildInPublicContent(phase, queued.description);
    }
    default:
      throw new Error(`自動生成非対応の記事タイプ: ${type}`);
  }
}

// ==========================================
// 1日4投稿を一括生成
// ==========================================
export async function createDailyBlogPosts(
  phase: BlogPostPhase,
): Promise<{ dailyCard: BlogPostRow; tarotTip: BlogPostRow; feature: BlogPostRow; tarotGuide: BlogPostRow }> {
  const [dailyCardResult, tarotTipResult, featureResult, tarotGuideResult] = await Promise.all([
    generateDailyCardContent(new Date()),
    generateTarotTipContent(phase, await blogPostRepository.findRecentTitles(BlogPostType.TAROT_TIP, 30)),
    (async () => {
      const isPreLaunch = phase === BlogPostPhase.PRE_LAUNCH;
      if (isPreLaunch) {
        const queued = await blogFeatureQueueRepository.findNextPending();
        if (queued) return { queued, result: await generateBuildInPublicContent(phase, queued.description) };
      }
      const recentTitles = await blogPostRepository.findRecentTitles(BlogPostType.APP_PROMO, 30);
      return { queued: null, result: await generateAppPromoContent(recentTitles) };
    })(),
    generateTarotGuideContent(await blogPostRepository.findRecentTitles(BlogPostType.TAROT_GUIDE, 30)),
  ]);

  const { queued, result: featureGenResult } = featureResult as { queued: { id: string } | null; result: GenerateBlogPostResult };

  const featureType = phase === BlogPostPhase.PRE_LAUNCH && queued
    ? BlogPostType.BUILD_IN_PUBLIC
    : BlogPostType.APP_PROMO;

  const [dailyCard, tarotTip, feature, tarotGuide] = await Promise.all([
    savePost(dailyCardResult, BlogPostType.DAILY_CARD),
    savePost(tarotTipResult, BlogPostType.TAROT_TIP),
    savePost(featureGenResult, featureType),
    savePost(tarotGuideResult, BlogPostType.TAROT_GUIDE),
  ]);

  if (queued && feature) {
    await blogFeatureQueueRepository.markPublished(queued.id, feature.id);
  }

  return { dailyCard, tarotTip, feature, tarotGuide };
}

async function savePost(result: GenerateBlogPostResult, type: BlogPostType): Promise<BlogPostRow> {
  const status = result.metaExtracted ? BlogPostStatus.PUBLISHED : BlogPostStatus.DRAFT;
  const saved = await blogPostRepository.create({
    title: result.title,
    slug: result.slug,
    content: result.content,
    excerpt: result.excerpt,
    metaDescription: result.metaDescription,
    tags: result.tags,
    coverImageUrl: result.coverImageUrl ?? undefined,
    status,
    postType: type,
    isAuto: true,
    prompt: result.cardCode
      ? JSON.stringify({ cardCode: result.cardCode, isReversed: result.isReversed })
      : undefined,
    publishedAt: result.metaExtracted ? new Date() : undefined,
  });

  if (result.metaExtracted) {
    logger.info("ブログ記事自動生成・公開完了", { id: saved.id, title: saved.title, type });
  } else {
    logger.warn("ブログ記事自動生成: メタデータ抽出失敗のためDRAFT保存", { id: saved.id, type });
  }
  return saved;
}

// ==========================================
// 個別投稿（管理画面・後方互換）
// ==========================================
export async function createAutoPost(
  type: BlogPostType,
  phase?: BlogPostPhase,
  customPrompt?: string,
): Promise<BlogPostRow> {
  const resolvedPhase = phase ?? (await blogPostConfigRepository.get()).phase;
  const generated = await generateBlogContent(type, resolvedPhase, customPrompt);
  return savePost(generated, type);
}

export async function publish(postId: string): Promise<void> {
  const post = await blogPostRepository.findById(postId);
  if (!post) throw new Error(`記事が見つかりません: ${postId}`);
  if (post.status === BlogPostStatus.PUBLISHED) throw new Error("すでに公開済みです");

  await blogPostRepository.update(postId, {
    status: BlogPostStatus.PUBLISHED,
    publishedAt: new Date(),
  });
  logger.info("ブログ記事公開", { postId, title: post.title });
}

export async function processDue(): Promise<{ published: number; failed: number }> {
  const due = await blogPostRepository.findDue();
  let published = 0;
  let failed = 0;

  for (const post of due) {
    try {
      await publish(post.id);
      published++;
    } catch {
      failed++;
    }
  }

  return { published, failed };
}

export { APP_URL, BlogPostPhase };
