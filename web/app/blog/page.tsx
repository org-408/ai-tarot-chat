import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MonteCarlo } from "next/font/google";
import { blogPostRepository } from "@/lib/server/repositories/blog-post";

const monteCarlo = MonteCarlo({ subsets: ["latin"], weight: "400" });

const BASE_URL = process.env.AUTH_URL ?? "https://ariadne-ai.app";

export const metadata: Metadata = {
  title: "Ariadne AIタロット占いブログ",
  description: "タロット占いの使い方、カードの意味、AI占いの活用法などを解説するAriadneの公式ブログ。",
  alternates: {
    canonical: `${BASE_URL}/blog`,
    languages: { ja: `${BASE_URL}/blog` },
  },
  openGraph: {
    title: "Ariadne AIタロット占いブログ",
    description: "タロット占いの使い方、カードの意味、AI占いの活用法などを解説するAriadneの公式ブログ。",
    url: `${BASE_URL}/blog`,
    type: "website",
    images: [{ url: `${BASE_URL}/tarotists/Ariadne.png` }],
  },
};

export const dynamic = "force-dynamic";

const HERO_TAROTISTS = [
  { name: "Luna", tilt: "-rotate-3" },
  { name: "Clara", tilt: "-rotate-1" },
  { name: "Ariadne", tilt: "" },
  { name: "Stella", tilt: "rotate-3" },
] as const;

export default async function BlogListPage() {
  const posts = await blogPostRepository.findPublished({ limit: 20 });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Ariadne AIタロット占いブログ",
    description: "タロット占いの使い方、カードの意味、AI占いの活用法を解説。",
    url: `${BASE_URL}/blog`,
    inLanguage: "ja",
    publisher: {
      "@type": "Organization",
      name: "Ariadne - AI Tarot Chat",
      alternateName: "Ariadne AIタロット占い",
      url: BASE_URL,
    },
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-indigo-900 to-purple-800 text-white">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 pt-12 pb-6 text-center">
          <h1 className="mb-3 leading-tight">
            <span className={`${monteCarlo.className} text-5xl sm:text-6xl text-purple-200 block`}>
              Ariadne
            </span>
            <span className="text-2xl sm:text-3xl font-bold block mt-1">
              AIタロット占いブログ
            </span>
          </h1>
          <p className="text-purple-300 text-sm sm:text-base max-w-xl mx-auto mt-3 mb-8">
            タロットカードの意味・スプレッドの使い方・AI占いの活用法を発信
          </p>

          {/* Card fan */}
          <div className="flex justify-center mb-8">
            <div className="relative w-20 h-28 flex-shrink-0">
              <div
                className="absolute inset-0 rounded-lg overflow-hidden shadow-lg"
                style={{ transform: "rotate(-12deg)", transformOrigin: "bottom center" }}
              >
                <Image src="/cards/back.png" alt="" fill className="object-cover" sizes="80px" />
              </div>
              <div
                className="absolute inset-0 rounded-lg overflow-hidden shadow-lg"
                style={{ transform: "rotate(12deg)", transformOrigin: "bottom center" }}
              >
                <Image src="/cards/back.png" alt="" fill className="object-cover" sizes="80px" />
              </div>
              <div className="absolute inset-0 rounded-lg overflow-hidden shadow-xl z-10">
                <Image src="/cards/0_fool.png" alt="" fill className="object-cover" sizes="80px" />
              </div>
            </div>
          </div>
        </div>

        {/* Tarotist images row */}
        <div className="relative flex justify-center items-end gap-2 sm:gap-4 max-w-2xl mx-auto px-4">
          {HERO_TAROTISTS.map(({ name, tilt }) => {
            const isCenter = name === "Ariadne";
            return (
              <div
                key={name}
                className={`relative overflow-hidden rounded-t-2xl flex-shrink-0 ${tilt} ${
                  isCenter
                    ? "w-36 sm:w-44 h-52 sm:h-64 z-10"
                    : "w-24 sm:w-32 h-36 sm:h-48"
                }`}
              >
                <Image
                  src={`/tarotists/${name}.png`}
                  alt={name}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 100px, 180px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-950/70 via-transparent to-transparent" />
                <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/90 font-medium drop-shadow">
                  {name}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Blog list */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        {posts.length === 0 ? (
          <div className="text-center text-zinc-400 py-16">
            <p>まだ記事がありません。</p>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article key={post.id} className="border-b pb-8 last:border-0">
                <Link href={`/blog/${post.slug}`} className="group block">
                  {post.coverImageUrl && (
                    <div className="mb-4 rounded-xl overflow-hidden aspect-video bg-zinc-100">
                      <img
                        src={post.coverImageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <h2 className="text-xl font-bold text-zinc-900 group-hover:text-sky-600 transition-colors mb-2">
                    {post.title}
                  </h2>
                </Link>
                {post.excerpt && (
                  <p className="text-zinc-600 text-sm leading-relaxed mb-3">{post.excerpt}</p>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  {post.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                  {post.publishedAt && (
                    <span className="text-xs text-zinc-400 ml-auto">
                      {new Date(post.publishedAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
