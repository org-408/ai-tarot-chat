"use client";

import { Input } from "@/components/ui/input";
import { useState } from "react";

const PLAN_COLOR: Record<string, string> = {
  GUEST: "bg-slate-400",
  FREE: "bg-green-500",
  STANDARD: "bg-blue-500",
  PREMIUM: "bg-purple-500",
};

const PLAN_BADGE: Record<string, string> = {
  GUEST: "bg-slate-100 text-slate-600",
  FREE: "bg-green-100 text-green-700",
  STANDARD: "bg-blue-100 text-blue-700",
  PREMIUM: "bg-purple-100 text-purple-700",
};

type PlanRevenue = { plan: string; name: string; price: number; count: number; mrr: number };
type MonthlyChange = { month: string; upgrades: number; downgrades: number };
type ChangeRow = {
  id: string;
  clientId: string;
  clientName: string | null;
  clientEmail: string | null;
  fromPlan: string;
  fromCode: string;
  fromPrice: number;
  toPlan: string;
  toCode: string;
  toPrice: number;
  reason: string | null;
  changedAt: string;
};

const PAGE_SIZE = 20;

function fmt(yen: number) {
  return `¥${yen.toLocaleString()}`;
}

export function RevenuePageClient({
  planRevenue,
  totalMrr,
  monthlyChanges,
  recentChanges,
}: {
  planRevenue: PlanRevenue[];
  totalMrr: number;
  monthlyChanges: MonthlyChange[];
  recentChanges: ChangeRow[];
}) {
  const [changeKeyword, setChangeKeyword] = useState("");
  const [changeDirectionFilter, setChangeDirectionFilter] = useState<"ALL" | "UP" | "DOWN">("ALL");
  const [changePage, setChangePage] = useState(0);

  const filteredChanges = recentChanges.filter((c) => {
    if (changeDirectionFilter === "UP" && c.toPrice <= c.fromPrice) return false;
    if (changeDirectionFilter === "DOWN" && c.toPrice >= c.fromPrice) return false;
    if (changeKeyword) {
      const kw = changeKeyword.toLowerCase();
      if (
        !(c.clientName ?? "").toLowerCase().includes(kw) &&
        !(c.clientEmail ?? "").toLowerCase().includes(kw)
      )
        return false;
    }
    return true;
  });

  const changePageCount = Math.ceil(filteredChanges.length / PAGE_SIZE);
  const pagedChanges = filteredChanges.slice(changePage * PAGE_SIZE, (changePage + 1) * PAGE_SIZE);

  const maxMrr = Math.max(...planRevenue.map((p) => p.mrr), 1);
  const maxChange = Math.max(...monthlyChanges.map((m) => m.upgrades + m.downgrades), 1);

  const paidCount = planRevenue.filter((p) => p.plan !== "GUEST").reduce((s, p) => s + p.count, 0);
  const totalCount = planRevenue.reduce((s, p) => s + p.count, 0);

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">収益レポート</h1>
        <p className="text-sm text-slate-500 mt-1">プラン別 MRR・プラン変更履歴（RevenueCat 連携なし、DB 情報ベース）</p>
      </div>

      {/* MRR サマリー */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">推定 MRR</p>
          <p className="text-3xl font-bold text-slate-900">{fmt(totalMrr)}</p>
          <p className="text-xs text-slate-400 mt-1">月額収益の合計</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">有料ユーザー数</p>
          <p className="text-3xl font-bold text-slate-900">{paidCount.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">GUEST 除く</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">有料転換率</p>
          <p className="text-3xl font-bold text-slate-900">
            {totalCount > 0 ? ((paidCount / totalCount) * 100).toFixed(1) : "0"}%
          </p>
          <p className="text-xs text-slate-400 mt-1">全クライアント中</p>
        </div>
      </div>

      {/* プラン別 MRR */}
      <div className="rounded-xl border border-slate-200 p-5 mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">プラン別 MRR 内訳</h2>
        <div className="space-y-4">
          {planRevenue.map((p) => (
            <div key={p.plan} className="flex items-center gap-3">
              <span className={`rounded px-2 py-0.5 text-xs font-medium w-20 text-center ${PLAN_BADGE[p.plan] ?? "bg-slate-100 text-slate-600"}`}>
                {p.name}
              </span>
              <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${PLAN_COLOR[p.plan] ?? "bg-slate-400"}`}
                  style={{ width: `${maxMrr > 0 ? (p.mrr / maxMrr) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 w-10 text-right">{p.count}人</span>
              <span className="text-xs text-slate-500 w-14 text-right">{fmt(p.price)}/月</span>
              <span className="text-sm font-semibold text-slate-800 w-20 text-right">{fmt(p.mrr)}</span>
            </div>
          ))}
          {planRevenue.length === 0 && <p className="text-sm text-slate-400">データがありません</p>}
        </div>
      </div>

      {/* 月別プラン変更 */}
      <div className="rounded-xl border border-slate-200 p-5 mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">月別プラン変更数（過去6ヶ月）</h2>
        <div className="flex items-end gap-4 h-36">
          {monthlyChanges.map((m) => {
            const upH = maxChange > 0 ? Math.max((m.upgrades / maxChange) * 100, m.upgrades > 0 ? 4 : 0) : 0;
            const dnH = maxChange > 0 ? Math.max((m.downgrades / maxChange) * 100, m.downgrades > 0 ? 4 : 0) : 0;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-0.5" style={{ height: "108px" }}>
                  <div className="w-1/2 bg-green-400 rounded-t" style={{ height: `${upH}%` }} title={`アップグレード: ${m.upgrades}`} />
                  <div className="w-1/2 bg-red-400 rounded-t" style={{ height: `${dnH}%` }} title={`ダウングレード: ${m.downgrades}`} />
                </div>
                <span className="text-[9px] text-slate-400">{m.month.slice(5)}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" />アップグレード</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" />ダウングレード</span>
        </div>
      </div>

      {/* プラン変更履歴 */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">プラン変更履歴（{recentChanges.length}件取得）</span>
          <div className="ml-auto flex flex-wrap gap-2 items-center">
            <Input
              placeholder="名前・メールで検索"
              value={changeKeyword}
              onChange={(e) => { setChangeKeyword(e.target.value); setChangePage(0); }}
              className="h-7 text-xs w-44"
            />
            {(["ALL", "UP", "DOWN"] as const).map((d) => (
              <button
                key={d}
                onClick={() => { setChangeDirectionFilter(d); setChangePage(0); }}
                className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                  changeDirectionFilter === d
                    ? d === "UP"
                      ? "bg-green-600 text-white border-green-600"
                      : d === "DOWN"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-slate-700 text-white border-slate-700"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {d === "ALL" ? "全て" : d === "UP" ? "▲ アップ" : "▼ ダウン"}
              </button>
            ))}
            <span className="text-xs text-slate-400">{filteredChanges.length}件</span>
          </div>
        </div>
        {filteredChanges.length === 0 ? (
          <p className="text-sm text-slate-400 px-4 py-3">該当する変更履歴がありません</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">ユーザー</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">変更</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">理由</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">日時</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedChanges.map((c) => {
                  const isUpgrade = c.toPrice > c.fromPrice;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <a href={`/admin/clients/${c.clientId}`} className="font-medium text-sky-600 hover:underline">
                          {c.clientName ?? "—"}
                        </a>
                        <div className="text-xs text-slate-400">{c.clientEmail}</div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${PLAN_BADGE[c.fromCode] ?? "bg-slate-100 text-slate-600"}`}>{c.fromPlan}</span>
                          <span className={`text-xs font-bold ${isUpgrade ? "text-green-600" : "text-red-500"}`}>→</span>
                          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${PLAN_BADGE[c.toCode] ?? "bg-slate-100 text-slate-600"}`}>{c.toPlan}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {isUpgrade
                            ? <span className="text-green-600">+{fmt(c.toPrice - c.fromPrice)}/月</span>
                            : <span className="text-red-500">{fmt(c.toPrice - c.fromPrice)}/月</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-slate-500">{c.reason ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-400 whitespace-nowrap">
                        {new Date(c.changedAt).toLocaleDateString("ja-JP")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {changePageCount > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t bg-slate-50 text-xs text-slate-500">
                <span>
                  {changePage * PAGE_SIZE + 1}〜{Math.min((changePage + 1) * PAGE_SIZE, filteredChanges.length)} / {filteredChanges.length}件
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={changePage === 0}
                    onClick={() => setChangePage((p) => p - 1)}
                    className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-slate-100"
                  >
                    前へ
                  </button>
                  <button
                    disabled={changePage >= changePageCount - 1}
                    onClick={() => setChangePage((p) => p + 1)}
                    className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-slate-100"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
