import { BlogPostStatus } from "@/lib/generated/prisma/client";
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

export async function generateBlogContent(customPrompt?: string): Promise<GenerateBlogPostResult> {
  const systemPrompt = `あなたはAIタロット占いアプリ「Ariadne（アリアドネ）」のブログライターです。
SEOに最適化された日本語のブログ記事を書きます。
記事はMarkdown形式で書いてください。
見出し(##, ###)、箇条書き、太字などを適切に使ってください。`;

  const userPrompt = customPrompt ?? `タロット占いに関する読者に価値のあるブログ記事を1本書いてください。
例: タロットカードの意味、占いの使い方、スプレッドの紹介、AI占いの活用法など。
記事の長さは800〜1200文字程度。
最後にJSON形式で以下を返してください:
{"title": "記事タイトル", "excerpt": "120文字以内の概要", "metaDescription": "160文字以内のSEO用説明", "tags": ["タグ1", "タグ2", "タグ3"]}`;

  const { text } = await generateText({
    model: getGenerationModel(),
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 2000,
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

export async function createAutoPost(customPrompt?: string): Promise<BlogPostRow> {
  const generated = await generateBlogContent(customPrompt);
  const slug = generateSlug(generated.title);

  const post = await blogPostRepository.create({
    title: generated.title,
    slug,
    content: generated.content,
    excerpt: generated.excerpt,
    metaDescription: generated.metaDescription,
    tags: generated.tags,
    status: BlogPostStatus.DRAFT,
    isAuto: true,
  });

  logger.info("ブログ記事自動生成完了", { id: post.id, title: post.title });
  return post;
}

export { APP_URL };
