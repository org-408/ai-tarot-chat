import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { blogPostRepository, blogPostConfigRepository } from "@/lib/server/repositories/blog-post";
import { BlogPageClient } from "./blog-page-client";

export default async function BlogAdminPage() {
  await assertAdminSession();

  const [posts, totalCount, config] = await Promise.all([
    blogPostRepository.findMany({ limit: 50 }),
    blogPostRepository.count(),
    blogPostConfigRepository.get(),
  ]);

  const initialPosts = posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    content: p.content,
    excerpt: p.excerpt,
    coverImageUrl: p.coverImageUrl,
    tags: p.tags,
    metaDescription: p.metaDescription,
    status: p.status,
    postType: p.postType,
    isAuto: p.isAuto,
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <BlogPageClient
      initialPosts={initialPosts}
      totalCount={totalCount}
      initialAutoPostEnabled={config.autoPostEnabled}
      initialPhase={config.phase}
    />
  );
}
