import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeExternalLinks from "rehype-external-links";
import rehypeStringify from "rehype-stringify";
import { blogPostRepository } from "@/lib/server/repositories/blog-post";
import { BlogPostStatus } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const BASE_URL = process.env.AUTH_URL ?? "https://ariadne-ai.app";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await blogPostRepository.findBySlug(slug);
  if (!post || post.status !== BlogPostStatus.PUBLISHED) return {};

  return {
    title: `${post.title} — Ariadne AIタロット占いブログ`,
    description: post.metaDescription ?? post.excerpt ?? undefined,
    alternates: {
      canonical: `${BASE_URL}/blog/${post.slug}`,
      languages: { ja: `${BASE_URL}/blog/${post.slug}` },
    },
    openGraph: {
      title: post.title,
      description: post.metaDescription ?? post.excerpt ?? undefined,
      url: `${BASE_URL}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      tags: post.tags,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : [{ url: `${BASE_URL}/tarotists/Ariadne.png` }],
    },
  };
}

async function markdownToHtml(md: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeExternalLinks, { target: "_blank", rel: ["nofollow", "noopener", "noreferrer"] })
    .use(rehypeStringify)
    .process(md);
  return String(result);
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await blogPostRepository.findBySlug(slug);

  if (!post || post.status !== BlogPostStatus.PUBLISHED) {
    notFound();
  }

  const htmlContent = await markdownToHtml(post.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription ?? post.excerpt,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    url: `${BASE_URL}/blog/${post.slug}`,
    image: post.coverImageUrl ?? `${BASE_URL}/tarotists/Ariadne.png`,
    keywords: post.tags.join(", "),
    author: {
      "@type": "Organization",
      name: "Ariadne - AI Tarot Chat",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Ariadne - AI Tarot Chat",
      alternateName: "Ariadne AIタロット占い",
      url: BASE_URL,
    },
    inLanguage: "ja",
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
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      <footer className="mt-12 pt-8 border-t">
        <div className="bg-gradient-to-br from-violet-50 to-sky-50 rounded-2xl p-6 text-center">
          <p className="text-zinc-600 mb-4">AI Tarot Chatを試してみませんか？</p>
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
