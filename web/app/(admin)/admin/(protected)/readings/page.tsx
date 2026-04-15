import { adminService } from "@/lib/server/services/admin";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { ReadingsPageClient } from "./readings-page-client";

interface SearchParams {
  page?: string;
  q?: string;
  cid?: string;
  tarotistId?: string;
  spreadId?: string;
  categoryId?: string;
  date?: string;
}

const LIMIT = 50;

export default async function ReadingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await assertAdminSession();

  const { page, q, cid, tarotistId, spreadId, categoryId, date } =
    await searchParams;
  const currentPage = Math.max(1, Number(page ?? 1));
  const keyword = q?.trim() ?? "";
  const clientIdFilter = cid?.trim() ?? "";

  let dateFrom: Date | undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date === "today") {
    dateFrom = today;
  } else if (date === "week") {
    dateFrom = new Date(today);
    dateFrom.setDate(today.getDate() - 6);
  } else if (date === "month") {
    dateFrom = new Date(today);
    dateFrom.setDate(1);
  }

  const [{ readings, total }, filters] = await Promise.all([
    adminService.listReadings(
      { keyword, clientId: clientIdFilter, tarotistId, spreadId, categoryId, dateFrom },
      { skip: (currentPage - 1) * LIMIT, take: LIMIT }
    ),
    adminService.getReadingFilters(),
  ]);

  return (
    <ReadingsPageClient
      data={{
        readings: readings.map((r) => ({
          id: r.id,
          createdAt: r.createdAt.toISOString(),
          customQuestion: r.customQuestion,
          client: {
            id: r.client.id,
            name: r.client.name,
            email: r.client.email,
            isRegistered: r.client.isRegistered,
            plan: r.client.plan,
          },
          tarotist: r.tarotist,
          spread: {
            id: r.spread.id,
            name: r.spread.name,
            cellCount: r.spread._count.cells,
          },
          category: r.category,
          cards: r.cards.map((c) => ({
            id: c.id,
            order: c.order,
            position: c.position,
            isReversed: c.isReversed,
            keywords: c.keywords,
            cardName: c.card.name,
            cardCode: c.card.code,
          })),
        })),
        total,
        page: currentPage,
        limit: LIMIT,
      }}
      filters={{
        tarotists: filters.tarotists.map((t) => ({ id: t.id, name: t.name, icon: t.icon })),
        spreads: filters.spreads.map((s) => ({ id: s.id, name: s.name })),
        categories: filters.categories.map((c) => ({ id: c.id, name: c.name })),
        clients: filters.clients,
      }}
      currentFilters={{
        keyword,
        clientId: clientIdFilter,
        tarotistId: tarotistId ?? "",
        spreadId: spreadId ?? "",
        categoryId: categoryId ?? "",
        date: date ?? "",
      }}
    />
  );
}
