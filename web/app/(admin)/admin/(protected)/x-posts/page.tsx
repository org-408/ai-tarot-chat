import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { xPostRepository, xPostConfigRepository } from "@/lib/server/repositories/x-post";
import { isTwitterConfigured } from "@/lib/server/services/twitter";
import { XPostsPageClient } from "./x-posts-page-client";

export default async function XPostsPage() {
  await assertAdminSession();

  const [posts, totalCount, config] = await Promise.all([
    xPostRepository.findMany({ limit: 50 }),
    xPostRepository.count(),
    xPostConfigRepository.get(),
  ]);

  const initialPosts = posts.map((p) => ({
    id: p.id,
    content: p.content,
    tweetId: p.tweetId,
    status: p.status,
    postType: p.postType,
    error: p.error,
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    postedAt: p.postedAt?.toISOString() ?? null,
    isAuto: p.isAuto,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <XPostsPageClient
      initialPosts={initialPosts}
      totalCount={totalCount}
      twitterConfigured={isTwitterConfigured()}
      initialAutoPostEnabled={config.autoPostEnabled}
      initialPhase={config.phase}
    />
  );
}
