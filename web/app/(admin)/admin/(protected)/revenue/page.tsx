import { adminService } from "@/lib/server/services/admin";
import { RevenuePageClient } from "./revenue-page-client";

function monthKey(date: Date): string {
  const d = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export default async function RevenuePage() {
  const MONTHS = 6;
  const since = new Date(new Date().getFullYear(), new Date().getMonth() - MONTHS + 1, 1);

  const { plans, clientsByPlan, recentChanges } = await adminService.getRevenueSummary(since);

  const planMap = new Map(plans.map((p) => [p.id, p]));

  const planRevenue = clientsByPlan.map((g) => {
    const plan = planMap.get(g.planId);
    return {
      plan: plan?.code ?? "UNKNOWN",
      name: plan?.name ?? "不明",
      price: plan?.price ?? 0,
      count: g._count,
      mrr: (plan?.price ?? 0) * g._count,
    };
  }).sort((a, b) => b.mrr - a.mrr);

  const totalMrr = planRevenue.reduce((s, p) => s + p.mrr, 0);

  const months = buildMonths(MONTHS);
  const changesByMonth = new Map<string, { upgrades: number; downgrades: number }>();
  for (const m of months) changesByMonth.set(m, { upgrades: 0, downgrades: 0 });

  for (const c of recentChanges) {
    const mk = monthKey(c.changedAt);
    const entry = changesByMonth.get(mk);
    if (!entry) continue;
    const isUpgrade = (c.toPlan.price ?? 0) > (c.fromPlan.price ?? 0);
    if (isUpgrade) entry.upgrades++;
    else entry.downgrades++;
  }

  const monthlyChanges = months.map((m) => ({
    month: m,
    ...changesByMonth.get(m)!,
  }));

  const recentRows = recentChanges.map((c) => ({
    id: c.id,
    clientId: c.client.id,
    clientName: c.client.name,
    clientEmail: c.client.email,
    fromPlan: c.fromPlan.name,
    fromCode: c.fromPlan.code,
    fromPrice: c.fromPlan.price ?? 0,
    toPlan: c.toPlan.name,
    toCode: c.toPlan.code,
    toPrice: c.toPlan.price ?? 0,
    reason: c.reason,
    changedAt: c.changedAt.toISOString(),
  }));

  return (
    <RevenuePageClient
      planRevenue={planRevenue}
      totalMrr={totalMrr}
      monthlyChanges={monthlyChanges}
      recentChanges={recentRows}
    />
  );
}
