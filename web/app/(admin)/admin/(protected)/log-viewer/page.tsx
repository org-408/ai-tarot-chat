import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { prisma } from "@/prisma/prisma";
import { LogsPageClient } from "./logs-page-client";

interface SearchParams {
  page?: string;
  level?: string;
  source?: string;
  date?: string;
  q?: string;
}

const LIMIT = 100;

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await assertAdminSession();

  const { page, level, source, date, q } = await searchParams;
  const currentPage = Math.max(1, Number(page ?? 1));
  const levelFilter = level ?? "ALL";
  const sourceFilter = source ?? "ALL";
  const keyword = q?.trim() ?? "";

  // 日付フィルター（dashboardと同じく createdAt ベース）
  let dateFrom: Date | undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date === "today") {
    dateFrom = today;
  } else if (date === "hour") {
    dateFrom = new Date(Date.now() - 60 * 60 * 1000);
  } else if (date === "week") {
    dateFrom = new Date(today);
    dateFrom.setDate(today.getDate() - 6);
  }

  const where = {
    ...(levelFilter !== "ALL" ? { level: levelFilter } : {}),
    ...(sourceFilter !== "ALL" ? { source: sourceFilter } : {}),
    ...(dateFrom ? { createdAt: { gte: dateFrom } } : {}),
    ...(keyword
      ? {
          OR: [
            { message: { contains: keyword, mode: "insensitive" as const } },
            { path: { contains: keyword, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [logs, total, sources] = await Promise.all([
    prisma.log.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * LIMIT,
      take: LIMIT,
    }),
    prisma.log.count({ where }),
    prisma.log.findMany({
      distinct: ["source"],
      select: { source: true },
      orderBy: { source: "asc" },
    }),
  ]);

  return (
    <LogsPageClient
      data={{
        logs: logs.map((log) => ({
          id: log.id,
          level: log.level,
          message: log.message,
          metadata: log.metadata as unknown as Record<string, unknown> | null,
          path: log.path,
          source: log.source,
          timestamp: log.timestamp?.toISOString() ?? log.createdAt.toISOString(),
          createdAt: log.createdAt.toISOString(),
          client: log.client
            ? {
                id: log.client.id,
                name: log.client.name,
                email: log.client.email,
              }
            : null,
        })),
        total,
        page: currentPage,
        limit: LIMIT,
      }}
      sources={sources.map((s) => s.source)}
      currentFilters={{
        level: levelFilter,
        source: sourceFilter,
        date: date ?? "",
        keyword,
      }}
    />
  );
}
