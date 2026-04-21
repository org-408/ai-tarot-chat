import type { Metadata } from "next";
import Link from "next/link";
import { blogPostRepository } from "@/lib/server/repositories/blog-post";

export const metadata: Metadata = {
  title: "ブログ — Ariadne - AI Tarot Chat",
  description: "タロット占いの使い方、カードの意味、AI占いの活用法などを解説するAriadneの公式ブログ。",
};

// ビルド時の prerender を避ける（CI では blog_posts テーブルが未作成）。
// admin からの revalidatePath("/blog") で更新するので dynamic で問題ない。
export const dynamic = "force-dynamic";

export default async function BlogListPage() {
  const posts = await blogPostRepository.findPublished({ limit: 20 });

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900">ブログ</h1>
        <p className="text-zinc-500 mt-2">タロット占いの使い方・カードの意味・AI占いの活用法など</p>
      </div>

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
    </main>
  );
}
