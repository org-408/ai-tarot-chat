import { BlogPostPhase, BlogPostStatus, BlogPostType } from "@/lib/generated/prisma/client";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { blogPostRepository, type BlogPostRow } from "@/lib/server/repositories/blog-post";
import logger from "@/lib/server/logger/logger";

const APP_URL = process.env.AUTH_URL ?? "https://ariadne-ai.app";

function getGenerationModel() {
  return anthropic("claude-haiku-4-5");
}

function generateSlug(title: string): string {
  const now = Date.now();
  const base = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50)
    .replace(/^-|-$/g, "");
  return base ? `${base}-${now}` : `post-${now}`;
}

export type GenerateBlogPostResult = {
  title: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  tags: string[];
};

export async function generateBlogContent(
  type: BlogPostType,
  customPrompt?: string,
): Promise<GenerateBlogPostResult> {
  let systemPrompt: string;
  let userPrompt: string;

  const jsonSuffix = `最後に必ず記事本文のあとに以下のJSONだけを出力してください:
{"title": "記事タイトル", "excerpt": "120文字以内の概要", "metaDescription": "160文字以内のSEO用説明", "tags": ["タグ1", "タグ2", "タグ3"]}`;

  if (customPrompt) {
    systemPrompt = `あなたはAIタロット占いアプリ「Ariadne（アリアドネ）」のブログライターです。
SEOに最適化された日本語のブログ記事を書きます。
記事はMarkdown形式で書いてください。見出し(##, ###)・箇条書き・太字などを適切に使ってください。`;
    userPrompt = `${customPrompt}\n\n${jsonSuffix}`;
  } else if (type === BlogPostType.TAROT_GUIDE) {
    systemPrompt = `あなたはタロット占いの講師です。初心者〜中級者向けに、タロットカードの意味やスプレッド、読み方のコツを日本語で解説します。
記事はMarkdown形式・1200〜1800文字程度。見出し(##, ###)・箇条書き・太字を適切に使い、SEOに有効なキーワードを自然に織り込んでください。`;
    userPrompt = `タロットカードの意味・スプレッド・読み方などから1つテーマを選び、初心者にも分かる解説記事を書いてください。
末尾に「Ariadne AIタロット占い」で実際に試せる旨を自然に添えてください。

${jsonSuffix}`;
  } else if (type === BlogPostType.TAROT_TIP) {
    systemPrompt = `あなたはタロット占いのライターです。タロットに関する豆知識や歴史・文化的背景を日本語で紹介します。
記事はMarkdown形式・800〜1200文字程度。読者が「へえ！」と思える雑学を複数織り込んでください。`;
    userPrompt = `タロットにまつわる豆知識や歴史・文化的トピックを1つ選び、読み物として楽しい記事を書いてください。

${jsonSuffix}`;
  } else if (type === BlogPostType.APP_PROMO) {
    systemPrompt = `あなたはAIタロット占いアプリ「Ariadne（アリアドネ）」のマーケター兼ライターです。
アプリの特徴や使い方を日本語のブログ記事として紹介します。押し売りにならない自然な紹介を心がけてください。
記事はMarkdown形式・1000〜1500文字程度。`;
    userPrompt = `「Ariadne AIタロット」アプリの魅力を伝える記事を書いてください。AIによる本格的なタロット占い、無料で始められること、複数タロティストから選べることなどを紹介してください。
末尾に ${APP_URL} からダウンロードできる旨を添えてください。

${jsonSuffix}`;
  } else if (type === BlogPostType.BUILD_IN_PUBLIC) {
    systemPrompt = `あなたはAIタロット占いアプリ「Ariadne（アリアドネ）」を個人開発しているエンジニアです。
開発過程・技術選定・学びを #buildinpublic の文脈で日本語のブログ記事にします。
記事はMarkdown形式・1000〜1500文字程度。技術的な内容を親しみやすく伝えてください。`;
    userPrompt = `個人開発で得た学び・工夫・失敗談から1テーマ選び、開発者ブログ記事を書いてください。
具体的な技術（Next.js / Capacitor / Prisma / AI SDK 等）に触れつつ、読み手に役立つ知見を残してください。

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

  // JSON部分を抽出
  const jsonMatch = text.match(/\{[\s\S]*"title"[\s\S]*\}/);
  let meta = { title: "", excerpt: "", metaDescription: "", tags: [] as string[] };
  let content = text;

  if (jsonMatch) {
    try {
      meta = JSON.parse(jsonMatch[0]);
      content = text.slice(0, text.lastIndexOf(jsonMatch[0])).trim();
    } catch {
      // JSON解析失敗時はそのまま
    }
  }

  return {
    title: meta.title || "Ariadne ブログ記事",
    content: content || text,
    excerpt: meta.excerpt || text.slice(0, 120),
    metaDescription: meta.metaDescription || text.slice(0, 160),
    tags: meta.tags.length > 0 ? meta.tags : ["タロット", "占い", "Ariadne"],
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

export async function createAutoPost(type: BlogPostType, customPrompt?: string): Promise<BlogPostRow> {
  const generated = await generateBlogContent(type, customPrompt);
  const slug = generateSlug(generated.title);

  const saved = await blogPostRepository.create({
    title: generated.title,
    slug,
    content: generated.content,
    excerpt: generated.excerpt,
    metaDescription: generated.metaDescription,
    tags: generated.tags,
    status: BlogPostStatus.PUBLISHED,
    postType: type,
    isAuto: true,
    prompt: customPrompt,
    publishedAt: new Date(),
  });

  logger.info("ブログ記事自動生成・公開完了", { id: saved.id, title: saved.title, type });
  return saved;
}

export { APP_URL, BlogPostPhase };
