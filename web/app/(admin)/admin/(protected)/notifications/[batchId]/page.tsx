import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { BatchDetailClient } from "./batch-detail-client";

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  await assertAdminSession();
  const { batchId } = await params;
  return <BatchDetailClient batchId={batchId} />;
}
