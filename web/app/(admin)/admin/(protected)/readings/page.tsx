import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { prisma } from "@/prisma/prisma";
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

  // 日付フィルター
  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;
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

  const where = {
    ...(dateFrom ? { createdAt: { gte: dateFrom, ...(dateTo ? { lte: dateTo } : {}) } } : {}),
    ...(clientIdFilter ? { clientId: clientIdFilter } : {}),
    ...(tarotistId ? { tarotistId } : {}),
    ...(spreadId ? { spreadId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(keyword
      ? {
          OR: [
            { client: { name: { contains: keyword, mode: "insensitive" as const } } },
            { client: { email: { contains: keyword, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [readings, total, tarotists, spreads, categories, clients] = await Promise.all([
    prisma.reading.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, email: true, isRegistered: true, plan: { select: { id: true, name: true, code: true } } } },
        tarotist: { select: { id: true, name: true, icon: true, model: true } },
        spread: { select: { id: true, name: true, _count: { select: { cells: true } } } },
        category: { select: { id: true, name: true } },
        cards: {
          select: {
            id: true,
            order: true,
            position: true,
            isReversed: true,
            keywords: true,
            card: { select: { name: true, code: true } },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * LIMIT,
      take: LIMIT,
    }),
    prisma.reading.count({ where }),
    prisma.tarotist.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, icon: true },
      orderBy: { no: "asc" },
    }),
    prisma.spread.findMany({
      select: { id: true, name: true },
      orderBy: { no: "asc" },
    }),
    prisma.readingCategory.findMany({
      select: { id: true, name: true },
      orderBy: { no: "asc" },
    }),
    prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
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
        tarotists: tarotists.map((t) => ({ id: t.id, name: t.name, icon: t.icon })),
        spreads: spreads.map((s) => ({ id: s.id, name: s.name })),
        categories: categories.map((c) => ({ id: c.id, name: c.name })),
        clients,
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
