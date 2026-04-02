import { prisma } from "@/prisma/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function fetchStats() {
  const [
    totalClients,
    clientsByPlan,
    todayReadings,
    totalTarotists,
    recentErrors,
  ] = await Promise.all([
    prisma.client.count({ where: { deletedAt: null } }),
    prisma.client.groupBy({
      by: ["planId"],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.reading.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.tarotist.count({ where: { deletedAt: null } }),
    prisma.log.count({
      where: {
        level: "error",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  // planId → plan name を解決
  const plans = await prisma.plan.findMany({
    select: { id: true, name: true, code: true },
  });
  const planMap = Object.fromEntries(plans.map((p) => [p.id, p]));

  const planBreakdown = clientsByPlan.map((row) => ({
    plan: planMap[row.planId]?.name ?? row.planId,
    code: planMap[row.planId]?.code ?? row.planId,
    count: row._count,
  }));

  // 7日間のアクティブクライアント（リーディングあり）
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeClients = await prisma.reading.groupBy({
    by: ["clientId"],
    where: { createdAt: { gte: sevenDaysAgo } },
  });

  return {
    totalClients,
    planBreakdown,
    todayReadings,
    totalTarotists,
    recentErrors,
    weeklyActiveClients: activeClients.length,
  };
}

const PLAN_COLOR: Record<string, string> = {
  GUEST: "bg-gray-100 text-gray-700",
  FREE: "bg-green-100 text-green-700",
  STANDARD: "bg-blue-100 text-blue-700",
  PREMIUM: "bg-purple-100 text-purple-700",
};

export default async function AdminDashboard() {
  const stats = await fetchStats();

  return (
    <div className="space-y-4 p-2">
      <h1 className="text-xl font-bold text-slate-800">📊 ダッシュボード</h1>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-slate-500">総クライアント</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">
              {stats.totalClients.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-slate-500">今日のリーディング</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-sky-600">
              {stats.todayReadings.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-slate-500">週間アクティブ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.weeklyActiveClients.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">過去7日間</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-slate-500">エラーログ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.recentErrors > 0 ? "text-red-600" : "text-slate-400"}`}>
              {stats.recentErrors.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">過去24時間</div>
          </CardContent>
        </Card>
      </div>

      {/* プラン別内訳 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">プラン別クライアント数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.planBreakdown
                .sort((a, b) => b.count - a.count)
                .map((row) => (
                  <div key={row.code} className="flex items-center gap-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium min-w-[80px] text-center ${
                        PLAN_COLOR[row.code] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.plan}
                    </span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-sky-500 rounded-full h-2"
                        style={{
                          width: `${Math.min(
                            (row.count / stats.totalClients) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 w-10 text-right">
                      {row.count}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">システム情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">タロティスト数</span>
                <span className="font-semibold">{stats.totalTarotists} 人</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">登録済みユーザー</span>
                <span className="font-semibold">
                  {stats.planBreakdown
                    .filter((p) => p.code !== "GUEST")
                    .reduce((sum, p) => sum + p.count, 0)}{" "}
                  人
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ゲストユーザー</span>
                <span className="font-semibold">
                  {stats.planBreakdown.find((p) => p.code === "GUEST")?.count ?? 0}{" "}
                  人
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
