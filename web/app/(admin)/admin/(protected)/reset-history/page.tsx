import { adminService } from "@/lib/server/services/admin";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { ResetHistoryPageClient } from "./reset-history-page-client";

export default async function ResetHistoryPage() {
  await assertAdminSession();

  const { histories, total } = await adminService.listDailyResetHistories(
    {},
    { skip: 0, take: 500 }
  );

  const rows = histories.map((h) => ({
    id: h.id,
    date: h.date.toISOString(),
    resetType: h.resetType,
    beforeReadingsCount: h.beforeReadingsCount,
    afterReadingsCount: h.afterReadingsCount,
    beforePersonalCount: h.beforePersonalCount,
    afterPersonalCount: h.afterPersonalCount,
    createdAt: h.createdAt.toISOString(),
    client: {
      id: h.client.id,
      name: h.client.name,
      email: h.client.email,
    },
  }));

  return <ResetHistoryPageClient histories={rows} total={total} />;
}
