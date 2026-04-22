import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { blogFeatureQueueRepository } from "@/lib/server/repositories/blog-post";
import { FeatureQueuePageClient } from "./feature-queue-page-client";

export default async function FeatureQueuePage() {
  await assertAdminSession();

  const [items, pendingCount] = await Promise.all([
    blogFeatureQueueRepository.findAll(),
    blogFeatureQueueRepository.countPending(),
  ]);

  const initialItems = items.map((item) => ({
    id: item.id,
    description: item.description,
    status: item.status,
    sortOrder: item.sortOrder,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    blogPostId: item.blogPostId,
    createdAt: item.createdAt.toISOString(),
  }));

  return <FeatureQueuePageClient initialItems={initialItems} initialPendingCount={pendingCount} />;
}
