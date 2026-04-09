import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { prisma } from "@/prisma/prisma";
import { LogsPageClient } from "./logs-page-client";

interface SearchParams {
  page?: string;
  level?: string;
  date?: string;
  q?: string;
  sort?: string;
}

const LIMIT = 100;

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await assertAdminSession();

  const { page, level, date, q, sort } = await searchParams;
  const currentPage = Math.max(1, Number(page ?? 1));
  const levelFilter = level ?? "ALL";
  const keyword = q?.trim() ?? "";
  const sortDir = sort === "asc" ? "asc" : "desc";

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
    ...(dateFrom ? { timestamp: { gte: dateFrom } } : {}),
    ...(keyword
      ? {
          OR: [
            { message: { contains: keyword, mode: "insensitive" as const } },
            { path: { contains: keyword, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.log.findMany({
      where,
      select: {
        id: true,
        level: true,
        message: true,
        metadata: true,
        clientId: true,
        path: true,
        source: true,
        timestamp: true,
        createdAt: true,
      },
      orderBy: { timestamp: sortDir },
      skip: (currentPage - 1) * LIMIT,
      take: LIMIT,
    }),
    prisma.log.count({ where }),
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
          clientId: log.clientId,
          timestamp: log.timestamp.toISOString(),
          createdAt: log.createdAt.toISOString(),
        })),
        total,
        page: currentPage,
        limit: LIMIT,
      }}
      currentFilters={{
        level: levelFilter,
        date: date ?? "",
        keyword,
        sort: sortDir,
      }}
    />
  );
}
