import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { blogPostRepository } from "@/lib/server/repositories/blog-post";
import { BlogPostStatus } from "@/lib/generated/prisma/client";

// generateStaticParams を入れた際に CI の DB 未作成でビルドが落ちるのを防ぐ。
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await blogPostRepository.findBySlug(slug);
  if (!post || post.status !== BlogPostStatus.PUBLISHED) return {};
  const baseUrl = process.env.AUTH_URL ?? "https://ariadne-ai.app";

  return {
    title: `${post.title} — Ariadne AI タロット占い`,
    description: post.metaDescription ?? post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.metaDescription ?? post.excerpt ?? undefined,
      url: `${baseUrl}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      tags: post.tags,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : [],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await blogPostRepository.findBySlug(slug);

  if (!post || post.status !== BlogPostStatus.PUBLISHED) {
    notFound();
  }

  const baseUrl = process.env.AUTH_URL ?? "https://ariadne-ai.app";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription ?? post.excerpt,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    url: `${baseUrl}/blog/${post.slug}`,
    image: post.coverImageUrl,
    keywords: post.tags.join(", "),
    publisher: {
      "@type": "Organization",
      name: "Ariadne AI タロット占い",
      url: baseUrl,
    },
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link href="/blog" className="text-sm text-sky-600 hover:underline mb-6 block">
        ← ブログ一覧に戻る
      </Link>

      {post.coverImageUrl && (
        <div className="mb-8 rounded-xl overflow-hidden aspect-video bg-zinc-100">
          <img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      <header className="mb-8">
        <div className="flex flex-wrap gap-2 mb-3">
          {post.tags.map((tag) => (
            <span key={tag} className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 leading-tight mb-3">{post.title}</h1>
        {post.publishedAt && (
          <time className="text-sm text-zinc-400">
            {new Date(post.publishedAt).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        )}
      </header>

      <div
        className="prose prose-zinc max-w-none prose-headings:font-bold prose-a:text-sky-600 prose-img:rounded-xl"
        dangerouslySetInnerHTML={{ __html: markdownToHtml(post.content) }}
      />

      <footer className="mt-12 pt-8 border-t">
        <div className="bg-gradient-to-br from-violet-50 to-sky-50 rounded-2xl p-6 text-center">
          <p className="text-zinc-600 mb-4">AIタロット占いを試してみませんか？</p>
          <Link
            href="/"
            className="inline-block bg-violet-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-violet-700 transition"
          >
            Ariadne を無料で始める
          </Link>
        </div>
      </footer>
    </main>
  );
}

// シンプルなMarkdown→HTML変換（改行・見出し・太字・箇条書きのみ）
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[h|u|o|l])(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");
}
