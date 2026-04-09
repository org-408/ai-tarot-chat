import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { prisma } from "@/prisma/prisma";
import { LogsPageClient } from "./logs-page-client";

interface SearchParams {
  page?: string;
  level?: string;
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

  const { page, level, date, q } = await searchParams;
  const currentPage = Math.max(1, Number(page ?? 1));
  const levelFilter = level ?? "ALL";
  const keyword = q?.trim() ?? "";

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

  let logs: Awaited<ReturnType<typeof prisma.log.findMany<{ select: { id: true; level: true; message: true; metadata: true; clientId: true; path: true; source: true; timestamp: true; createdAt: true } }>>> = [];
  let total = 0;
  let errorMessage: string | null = null;

  try {
    [logs, total] = await Promise.all([
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
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * LIMIT,
        take: LIMIT,
      }),
      prisma.log.count({ where }),
    ]);
  } catch (e) {
    errorMessage = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  if (errorMessage) {
    return (
      <div className="p-8">
        <h1 className="text-lg font-bold text-red-600 mb-4">ログ取得エラー</h1>
        <pre className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-800 whitespace-pre-wrap break-all">
          {errorMessage}
        </pre>
      </div>
    );
  }

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
      }}
    />
  );
}
