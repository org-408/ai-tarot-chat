import { adminService } from "@/lib/server/services/admin";
import { planService } from "@/lib/server/services/plan";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { notFound } from "next/navigation";
import { ClientDetailPage } from "./client-detail-page";

export default async function ClientDetailServerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await assertAdminSession();

  const { id } = await params;

  const [client, plans] = await Promise.all([
    adminService.getClientDetail(id),
    planService.getPlans(),
  ]);

  if (!client) notFound();

  return (
    <ClientDetailPage
      client={{
        id: client.id,
        name: client.name,
        email: client.email,
        image: client.image,
        isRegistered: client.isRegistered,
        provider: client.provider,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString(),
        lastLoginAt: client.lastLoginAt?.toISOString() ?? null,
        deletedAt: client.deletedAt?.toISOString() ?? null,
        dailyReadingsCount: client.dailyReadingsCount,
        dailyPersonalCount: client.dailyPersonalCount,
        lastReadingDate: client.lastReadingDate?.toISOString() ?? null,
        plan: {
          id: client.plan.id,
          name: client.plan.name,
          code: client.plan.code,
        },
        user: client.user
          ? {
              id: client.user.id,
              email: client.user.email,
              role: client.user.role,
            }
          : null,
        devices: client.devices.map((d) => ({
          id: d.id,
          deviceId: d.deviceId,
          platform: d.platform,
          appVersion: d.appVersion,
          osVersion: d.osVersion,
          lastSeenAt: d.lastSeenAt.toISOString(),
          createdAt: d.createdAt.toISOString(),
        })),
        planChangeHistories: client.planChangeHistories.map((h) => ({
          id: h.id,
          fromPlan: h.fromPlan,
          toPlan: h.toPlan,
          reason: h.reason,
          note: h.note,
          changedAt: h.changedAt.toISOString(),
        })),
        recentReadings: client.readings.map((r) => ({
          id: r.id,
          createdAt: r.createdAt.toISOString(),
          tarotist: r.tarotist,
          spread: r.spread,
          category: r.category,
        })),
        adminResetHistories: client.adminResetHistories.map((h) => ({
          id: h.id,
          resetType: h.resetType,
          adminEmail: h.adminEmail,
          reason: h.reason,
          beforeReadingsCount: h.beforeReadingsCount,
          beforePersonalCount: h.beforePersonalCount,
          afterReadingsCount: h.afterReadingsCount,
          afterPersonalCount: h.afterPersonalCount,
          createdAt: h.createdAt.toISOString(),
        })),
        dailyResetHistories: client.dailyResetHistories.map((h) => ({
          id: h.id,
          date: h.date.toISOString(),
          resetType: h.resetType,
          beforeReadingsCount: h.beforeReadingsCount,
          afterReadingsCount: h.afterReadingsCount,
          beforePersonalCount: h.beforePersonalCount,
          afterPersonalCount: h.afterPersonalCount,
          createdAt: h.createdAt.toISOString(),
        })),
        recentLogs: client.logs.map((l) => ({
          id: l.id,
          level: l.level,
          message: l.message,
          path: l.path,
          source: l.source,
          timestamp: l.timestamp.toISOString(),
          createdAt: l.createdAt.toISOString(),
        })),
      }}
      plans={plans.map((p) => ({ id: p.id, name: p.name, code: p.code }))}
    />
  );
}
