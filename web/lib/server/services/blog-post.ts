import { BlogPostPhase, BlogPostStatus, BlogPostType } from "@/lib/generated/prisma/client";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { blogPostRepository, blogPostConfigRepository, type BlogPostRow } from "@/lib/server/repositories/blog-post";
import logger from "@/lib/server/logger/logger";

const APP_URL = process.env.AUTH_URL ?? "https://ariadne-ai.app";

// ローンチ前の誘導先（リリース通知登録ページ）
const PRE_LAUNCH_CTA_URL = `${APP_URL}/download`;

function getGenerationModel() {
  return anthropic("claude-haiku-4-5");
}

// slug の正規化: ASCII 英数字とハイフンのみに絞る
function sanitizeSlug(rawSlug: string): string {
  return rawSlug
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
}

// AI が返した英語 slug を正規化して timestamp を付与する。
// AI が slug を返さない、または sanitize して空になった場合は `post-{timestamp}` にフォールバック。
function buildSlug(aiSlug: string | null | undefined): string {
  const timestamp = Date.now();
  if (aiSlug) {
    const sanitized = sanitizeSlug(aiSlug);
    if (sanitized) return `${sanitized}-${timestamp}`;
  }
  return `post-${timestamp}`;
}

export type GenerateBlogPostResult = {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  tags: string[];
  metaExtracted: boolean;
};

// phase と投稿タイプに応じた本文末尾 CTA の指示を組み立てる
function buildCtaInstruction(type: BlogPostType, phase: BlogPostPhase): string {
  const isPreLaunch = phase === BlogPostPhase.PRE_LAUNCH;

  if (isPreLaunch) {
    // PRE_LAUNCH は全投稿タイプで /download へ誘導（BUILD_IN_PUBLIC を除く）
    if (type === BlogPostType.BUILD_IN_PUBLIC) {
      return `記事末尾に「Ariadne AIタロット占いは近日公開予定です。開発の進捗は [Ariadne](${APP_URL}) をご覧ください」と自然に添えてください。`;
    }
    return `記事末尾に「Ariadne AIタロット占いは近日公開予定です。リリース通知の事前登録はこちらから → ${PRE_LAUNCH_CTA_URL}」という案内を自然な形で含めてください。`;
  }

  // POST_LAUNCH は各タイプに応じた通常の誘導
  if (type === BlogPostType.APP_PROMO) {
    return `末尾に ${APP_URL} からダウンロードできる旨を添えてください。`;
  }
  if (type === BlogPostType.TAROT_GUIDE || type === BlogPostType.TAROT_TIP) {
    return `末尾に「[Ariadne AIタロット占い](${APP_URL}) で実際に試せる」旨を自然に添えてください。`;
  }
  return "";
}

export async function generateBlogContent(
  type: BlogPostType,
  phase: BlogPostPhase = BlogPostPhase.POST_LAUNCH,
  customPrompt?: string,
): Promise<GenerateBlogPostResult> {
  let systemPrompt: string;
  let userPrompt: string;

  const jsonSuffix = `最後に必ず記事本文のあとに以下のJSONだけを出力してください:
{"title": "記事タイトル", "slug": "english-slug-in-kebab-case", "excerpt": "120文字以内の概要", "metaDescription": "160文字以内のSEO用説明", "tags": ["タグ1", "タグ2", "タグ3"]}

slug は ASCII 英小文字・数字・ハイフンのみで 50 文字以内。URL に使うため記事内容を表す英単語を 3〜6 語ハイフン区切りで表現してください（例: "tarot-major-arcana-guide", "how-to-read-tarot-cards"）。`;

  const ctaInstruction = buildCtaInstruction(type, phase);

  if (customPrompt) {
    systemPrompt = `あなたはAIタロット占いアプリ「Ariadne（アリアドネ）」のブログライターです。
SEOに最適化された日本語のブログ記事を書きます。
記事はMarkdown形式で書いてください。見出し(##, ###)・箇条書き・太字などを適切に使ってください。`;
    userPrompt = `${customPrompt}

${ctaInstruction}

${jsonSuffix}`;
  } else if (type === BlogPostType.TAROT_GUIDE) {
    systemPrompt = `あなたはタロット占いの講師です。初心者〜中級者向けに、タロットカードの意味やスプレッド、読み方のコツを日本語で解説します。
記事はMarkdown形式・1200〜1800文字程度。見出し(##, ###)・箇条書き・太字を適切に使い、SEOに有効なキーワードを自然に織り込んでください。`;
    userPrompt = `タロットカードの意味・スプレッド・読み方などから1つテーマを選び、初心者にも分かる解説記事を書いてください。
${ctaInstruction}

${jsonSuffix}`;
  } else if (type === BlogPostType.TAROT_TIP) {
    systemPrompt = `あなたはタロット占いのライターです。タロットに関する豆知識や歴史・文化的背景を日本語で紹介します。
記事はMarkdown形式・800〜1200文字程度。読者が「へえ！」と思える雑学を複数織り込んでください。`;
    userPrompt = `タロットにまつわる豆知識や歴史・文化的トピックを1つ選び、読み物として楽しい記事を書いてください。
${ctaInstruction}

${jsonSuffix}`;
  } else if (type === BlogPostType.APP_PROMO) {
    systemPrompt = `あなたはAIタロット占いアプリ「Ariadne（アリアドネ）」のマーケター兼ライターです。
アプリの特徴や使い方を日本語のブログ記事として紹介します。押し売りにならない自然な紹介を心がけてください。
記事はMarkdown形式・1000〜1500文字程度。`;
    const appPromoUserPrompt = phase === BlogPostPhase.PRE_LAUNCH
      ? `「Ariadne AIタロット」アプリの魅力を伝えるティザー記事を書いてください。AIによる本格的なタロット占い、複数タロティストから選べることなどを紹介しつつ、近日公開予定であり事前登録を募っている旨を自然に伝えてください。App Store / Google Play のリンクは含めないでください（まだ公開されていません）。`
      : `「Ariadne AIタロット」アプリの魅力を伝える記事を書いてください。AIによる本格的なタロット占い、無料で始められること、複数タロティストから選べることなどを紹介してください。`;
    userPrompt = `${appPromoUserPrompt}
${ctaInstruction}

${jsonSuffix}`;
  } else if (type === BlogPostType.BUILD_IN_PUBLIC) {
    systemPrompt = `あなたはAIタロット占いアプリ「Ariadne（アリアドネ）」のブログライターです。
開発中に追加した新機能・改善点・こだわりポイントを、一般ユーザー向けに分かりやすく紹介する記事を書きます。
記事はMarkdown形式・1000〜1500文字程度。技術用語は使わず、ユーザー目線で「こんなことができるようになった」「こう使うと便利」という視点で書いてください。`;
    userPrompt = `Ariadne AIタロット占いの新機能・改善・こだわりを1つテーマに選び、ユーザーが読んで「使ってみたい」と思えるブログ記事を書いてください。
【テーマ例】新しい占い師キャラクターの特徴、スプレッドの追加、画面・操作感の改善、AI占いの読み解き精度向上など。
技術的な実装方法ではなく、ユーザーにとってどんな体験が変わるか・どう便利になるかを中心に書いてください。
${ctaInstruction}

${jsonSuffix}`;
  } else {
    throw new Error(`自動生成非対応の記事タイプ: ${type}`);
  }

  const { text } = await generateText({
    model: getGenerationModel(),
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 3000,
  });

  // JSON部分を抽出（末尾の最後のマッチを使うことでコード例の { } に引っかからないようにする）
  const jsonMatches = [...text.matchAll(/\{[\s\S]*?"title"[\s\S]*?\}/g)];
  const jsonMatch = jsonMatches.at(-1);
  let meta: {
    title?: string;
    slug?: string;
    excerpt?: string;
    metaDescription?: string;
    tags?: string[];
  } = {};
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
    metaExtracted,
  };
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

export function getAutoPostTypesForPhase(phase: BlogPostPhase): BlogPostType[] {
  if (phase === BlogPostPhase.PRE_LAUNCH) {
    return [BlogPostType.BUILD_IN_PUBLIC, BlogPostType.TAROT_GUIDE, BlogPostType.TAROT_TIP];
  }
  return [BlogPostType.TAROT_GUIDE, BlogPostType.TAROT_TIP, BlogPostType.APP_PROMO];
}

export async function createAutoPost(
  type: BlogPostType,
  phase?: BlogPostPhase,
  customPrompt?: string,
): Promise<BlogPostRow> {
  const resolvedPhase = phase ?? (await blogPostConfigRepository.get()).phase;
  const generated = await generateBlogContent(type, resolvedPhase, customPrompt);

  const status = generated.metaExtracted ? BlogPostStatus.PUBLISHED : BlogPostStatus.DRAFT;
  const saved = await blogPostRepository.create({
    title: generated.title,
    slug: generated.slug,
    content: generated.content,
    excerpt: generated.excerpt,
    metaDescription: generated.metaDescription,
    tags: generated.tags,
    status,
    postType: type,
    isAuto: true,
    prompt: customPrompt,
    publishedAt: generated.metaExtracted ? new Date() : null,
  });

  if (generated.metaExtracted) {
    logger.info("ブログ記事自動生成・公開完了", { id: saved.id, title: saved.title, type, phase: resolvedPhase });
  } else {
    logger.warn("ブログ記事自動生成: メタデータ抽出失敗のためDRAFT保存", { id: saved.id, type, phase: resolvedPhase });
  }
  return saved;
}

export { APP_URL, BlogPostPhase };
