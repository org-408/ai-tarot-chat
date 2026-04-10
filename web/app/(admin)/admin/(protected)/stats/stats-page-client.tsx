"use client";

const PLAN_COLOR: Record<string, string> = {
  GUEST: "bg-slate-400",
  FREE: "bg-green-500",
  STANDARD: "bg-blue-500",
  PREMIUM: "bg-purple-500",
};

const PLAN_TEXT: Record<string, string> = {
  GUEST: "text-slate-600",
  FREE: "text-green-700",
  STANDARD: "text-blue-700",
  PREMIUM: "text-purple-700",
};

type DailyPoint = { date: string; count: number };
type PlanDist = { plan: string; name: string; count: number };
type TarotistRow = { id: string; name: string; icon: string; count: number };
type Summary = { totalClients: number; totalReadings: number; registeredClients: number };

function BarChart({ data, color = "bg-sky-500", labelFn }: {
  data: DailyPoint[];
  color?: string;
  labelFn?: (d: string) => string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d) => {
        const pct = Math.max((d.count / max) * 100, d.count > 0 ? 4 : 0);
        const label = labelFn ? labelFn(d.date) : d.date.slice(5);
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute bottom-8 hidden group-hover:flex flex-col items-center z-10">
              <div className="bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                {d.date}: {d.count}件
              </div>
            </div>
            <div className="w-full flex items-end justify-center" style={{ height: "88px" }}>
              <div
                className={`w-full rounded-t transition-all ${color}`}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-400 rotate-0">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function HBar({ label, value, max, color = "bg-sky-500", badge }: {
  label: string; value: number; max: number; color?: string; badge?: string;
}) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 text-lg text-center">{badge ?? ""}</span>
      <span className="w-28 text-sm text-slate-700 truncate">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-sm text-right text-slate-600 font-medium">{value}</span>
    </div>
  );
}

export function StatsPageClient({
  dailyClients,
  dailyReadings,
  planDist,
  topTarotists,
  summary,
}: {
  dailyClients: DailyPoint[];
  dailyReadings: DailyPoint[];
  planDist: PlanDist[];
  topTarotists: TarotistRow[];
  summary: Summary;
}) {
  const totalPlan = planDist.reduce((s, p) => s + p.count, 0);
  const maxTarotist = Math.max(...topTarotists.map((t) => t.count), 1);
  const guestCount = planDist.find((p) => p.plan === "GUEST")?.count ?? 0;

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">利用統計</h1>
        <p className="text-sm text-slate-500 mt-1">ユーザー・リーディングの推移とプラン分布</p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card label="総クライアント数" value={summary.totalClients.toLocaleString()} sub="ゲスト含む" />
        <Card label="登録済みユーザー" value={summary.registeredClients.toLocaleString()} sub={`ゲスト: ${guestCount.toLocaleString()}`} />
        <Card label="累計リーディング数" value={summary.totalReadings.toLocaleString()} sub="全期間合計" />
      </div>

      {/* 日別グラフ */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">新規クライアント（過去14日）</h2>
          <BarChart data={dailyClients} color="bg-sky-500" labelFn={(d) => d.slice(5)} />
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">リーディング数（過去14日）</h2>
          <BarChart data={dailyReadings} color="bg-violet-500" labelFn={(d) => d.slice(5)} />
        </div>
      </div>

      {/* プラン分布 */}
      <div className="rounded-xl border border-slate-200 p-5 mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">プラン別ユーザー分布</h2>
        <div className="flex gap-3 mb-4">
          {planDist.map((p) => (
            <div key={p.plan} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${PLAN_COLOR[p.plan] ?? "bg-slate-400"}`} />
              <span className={`text-xs font-medium ${PLAN_TEXT[p.plan] ?? "text-slate-600"}`}>{p.name}</span>
              <span className="text-xs text-slate-400">{p.count}</span>
            </div>
          ))}
        </div>
        {/* 積み上げバー */}
        <div className="flex rounded-full overflow-hidden h-6 mb-4">
          {planDist.map((p) => (
            <div
              key={p.plan}
              className={`${PLAN_COLOR[p.plan] ?? "bg-slate-400"} transition-all`}
              style={{ width: `${totalPlan > 0 ? (p.count / totalPlan) * 100 : 0}%` }}
              title={`${p.name}: ${p.count}`}
            />
          ))}
        </div>
        <div className="space-y-2">
          {planDist.map((p) => (
            <div key={p.plan} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${PLAN_COLOR[p.plan] ?? "bg-slate-400"}`} />
                <span className="text-slate-700">{p.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-slate-500">{totalPlan > 0 ? ((p.count / totalPlan) * 100).toFixed(1) : 0}%</span>
                <span className="font-medium text-slate-800 w-12 text-right">{p.count.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* タロティスト別 */}
      <div className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">タロティスト別リーディング数（全期間 Top 8）</h2>
        <div className="space-y-3">
          {topTarotists.map((t) => (
            <HBar key={t.id} label={t.name} value={t.count} max={maxTarotist} color="bg-amber-400" badge={t.icon} />
          ))}
          {topTarotists.length === 0 && (
            <p className="text-sm text-slate-400">データがありません</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}
