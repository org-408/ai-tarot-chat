import { planService } from "@/lib/server/services/plan";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { prisma } from "@/prisma/prisma";
import { ClientsPageClient } from "./clients-page-client";

interface SearchParams {
  page?: string;
  plan?: string;
  q?: string;
}

const LIMIT = 50;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await assertAdminSession();

  const { page, plan, q } = await searchParams;
  const currentPage = Math.max(1, Number(page ?? 1));
  const planFilter = plan ?? "ALL";
  const keyword = q?.trim() ?? "";

  const where = {
    deletedAt: null,
    ...(planFilter !== "ALL" ? { plan: { code: planFilter } } : {}),
    ...(keyword
      ? {
          OR: [
            { name: { contains: keyword, mode: "insensitive" as const } },
            { email: { contains: keyword, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [clients, total, plans] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        plan: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, email: true } },
        devices: { select: { id: true, platform: true, lastSeenAt: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * LIMIT,
      take: LIMIT,
    }),
    prisma.client.count({ where }),
    planService.getPlans(),
  ]);

  return (
    <ClientsPageClient
      data={{
        clients: clients.map((client) => ({
          id: client.id,
          name: client.name,
          email: client.email,
          createdAt: client.createdAt.toISOString(),
          lastLoginAt: client.lastLoginAt?.toISOString() ?? null,
          isRegistered: client.isRegistered,
          provider: client.provider,
          dailyReadingsCount: client.dailyReadingsCount,
          plan: client.plan,
          devices: client.devices.map((device) => ({
            id: device.id,
            platform: device.platform,
            lastSeenAt: device.lastSeenAt.toISOString(),
          })),
        })),
        total,
        page: currentPage,
        limit: LIMIT,
      }}
      plans={plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        code: plan.code,
      }))}
      planFilter={planFilter}
      keyword={keyword}
    />
  );
}
