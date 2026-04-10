import { prisma } from "@/prisma/prisma";
import { StatsPageClient } from "./stats-page-client";

function toJST(date: Date) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

function dayKey(date: Date) {
  const d = toJST(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function buildDays(n: number): string[] {
  const days: string[] = [];
  const now = toJST(new Date());
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`);
  }
  return days;
}

export default async function StatsPage() {
  const DAYS = 14;
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const days = buildDays(DAYS);

  const [
    recentClients,
    recentReadings,
    clientsByPlan,
    plans,
    topTarotists,
    tarotists,
    totalClients,
    totalReadings,
    registeredClients,
  ] = await Promise.all([
    prisma.client.findMany({
      where: { createdAt: { gte: since }, deletedAt: null },
      select: { createdAt: true },
    }),
    prisma.reading.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.client.groupBy({
      by: ["planId"],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.plan.findMany({ select: { id: true, name: true, code: true } }),
    prisma.reading.groupBy({
      by: ["tarotistId"],
      _count: { tarotistId: true },
      orderBy: { _count: { tarotistId: "desc" } },
      take: 8,
    }),
    prisma.tarotist.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, icon: true },
    }),
    prisma.client.count({ where: { deletedAt: null } }),
    prisma.reading.count(),
    prisma.client.count({ where: { deletedAt: null, isRegistered: true } }),
  ]);

  // 日別集計
  const clientByDay = new Map<string, number>();
  const readingByDay = new Map<string, number>();
  for (const c of recentClients) clientByDay.set(dayKey(c.createdAt), (clientByDay.get(dayKey(c.createdAt)) ?? 0) + 1);
  for (const r of recentReadings) readingByDay.set(dayKey(r.createdAt), (readingByDay.get(dayKey(r.createdAt)) ?? 0) + 1);

  const dailyClients = days.map((d) => ({ date: d, count: clientByDay.get(d) ?? 0 }));
  const dailyReadings = days.map((d) => ({ date: d, count: readingByDay.get(d) ?? 0 }));

  // プラン別
  const planMap = new Map(plans.map((p) => [p.id, p]));
  const planDist = clientsByPlan.map((g) => ({
    plan: planMap.get(g.planId)?.code ?? "UNKNOWN",
    name: planMap.get(g.planId)?.name ?? g.planId,
    count: g._count,
  })).sort((a, b) => b.count - a.count);

  // タロティスト別
  const tarotistMap = new Map(tarotists.map((t) => [t.id, t]));
  const topTarotistRows = topTarotists.map((g) => ({
    id: g.tarotistId,
    name: tarotistMap.get(g.tarotistId)?.name ?? "不明",
    icon: tarotistMap.get(g.tarotistId)?.icon ?? "🔮",
    count: g._count.tarotistId,
  }));

  return (
    <StatsPageClient
      dailyClients={dailyClients}
      dailyReadings={dailyReadings}
      planDist={planDist}
      topTarotists={topTarotistRows}
      summary={{ totalClients, totalReadings, registeredClients }}
    />
  );
}
