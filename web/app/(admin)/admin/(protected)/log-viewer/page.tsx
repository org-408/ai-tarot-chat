import { adminService } from "@/lib/server/services/admin";
import { type AdminLogSortField } from "@/lib/server/repositories/admin";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { LogsPageClient } from "./logs-page-client";

interface SearchParams {
  page?: string;
  level?: string;
  date?: string;
  q?: string;
  cid?: string;
  sort?: string;
  sortBy?: string;
}

const LIMIT = 100;
const VALID_SORT_FIELDS = [
  "timestamp",
  "createdAt",
  "level",
  "source",
  "path",
  "message",
  "clientId",
] as const;

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await assertAdminSession();

  const { page, level, date, q, cid, sort, sortBy } = await searchParams;
  const currentPage = Math.max(1, Number(page ?? 1));
  const levelFilter = level ?? "ALL";
  const keyword = q?.trim() ?? "";
  const clientIdFilter = cid?.trim() ?? "";
  const sortDir = sort === "asc" ? ("asc" as const) : ("desc" as const);
  const sortField: AdminLogSortField = VALID_SORT_FIELDS.includes(
    sortBy as AdminLogSortField
  )
    ? (sortBy as AdminLogSortField)
    : "timestamp";

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

  const [{ logs, total }, clients] = await Promise.all([
    adminService.listLogs(
      { level: levelFilter, dateFrom, clientId: clientIdFilter, keyword },
      { skip: (currentPage - 1) * LIMIT, take: LIMIT },
      { field: sortField, dir: sortDir }
    ),
    adminService.listClientsForFilter(),
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
      clients={clients}
      currentFilters={{
        level: levelFilter,
        date: date ?? "",
        keyword,
        clientId: clientIdFilter,
        sort: sortDir,
        sortBy: sortField,
      }}
    />
  );
}
