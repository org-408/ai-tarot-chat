"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";

type ResetRow = {
  id: string;
  date: string;
  resetType: string;
  beforeReadingsCount: number;
  afterReadingsCount: number;
  beforePersonalCount: number;
  afterPersonalCount: number;
  createdAt: string;
  client: { id: string; name: string | null; email: string | null };
};

const RESET_TYPE_LABELS: Record<string, string> = {
  PLAN_CHANGE: "プラン変更",
  USAGE_CHECK: "日次チェック",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP");
}

const PAGE_SIZE = 50;

export function ResetHistoryPageClient({
  histories,
  total,
}: {
  histories: ResetRow[];
  total: number;
}) {
  const [keyword, setKeyword] = useState("");
  const [resetTypeFilter, setResetTypeFilter] = useState("ALL");
  const [page, setPage] = useState(0);

  const filtered = histories.filter((h) => {
    if (resetTypeFilter !== "ALL" && h.resetType !== resetTypeFilter) return false;
    if (keyword) {
      const kw = keyword.toLowerCase();
      const name = (h.client.name ?? "").toLowerCase();
      const email = (h.client.email ?? "").toLowerCase();
      if (!name.includes(kw) && !email.includes(kw)) return false;
    }
    return true;
  });

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const resetTypes = ["ALL", ...Array.from(new Set(histories.map((h) => h.resetType)))];

  return (
    <div className="p-4 max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">日次自動リセット履歴</h1>
        <p className="text-sm text-slate-500 mt-1">プラン変更・日次チェックによる自動リセット記録（全{total}件）</p>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="名前・メールで検索"
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
          className="h-8 text-sm w-56"
        />
        <div className="flex gap-1">
          {resetTypes.map((t) => (
            <button
              key={t}
              onClick={() => { setResetTypeFilter(t); setPage(0); }}
              className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                resetTypeFilter === t
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {t === "ALL" ? "全種別" : (RESET_TYPE_LABELS[t] ?? t)}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400 self-center">{filtered.length}件</span>
      </div>

      {/* テーブル */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-500 whitespace-nowrap">記録日時</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 whitespace-nowrap">対象日</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 whitespace-nowrap">クライアント</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 whitespace-nowrap">種別</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 whitespace-nowrap">クイック前→後</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 whitespace-nowrap">パーソナル前→後</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">
                    該当するデータがありません
                  </td>
                </tr>
              ) : (
                paged.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{fmt(h.createdAt)}</td>
                    <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{fmtDate(h.date)}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/clients/${h.client.id}`}
                        className="text-sky-600 hover:underline font-medium"
                      >
                        {h.client.name ?? "(名前なし)"}
                      </Link>
                      <div className="text-xs text-slate-400">{h.client.email ?? "-"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700">
                        {RESET_TYPE_LABELS[h.resetType] ?? h.resetType}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {h.beforeReadingsCount} → {h.afterReadingsCount}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {h.beforePersonalCount} → {h.afterPersonalCount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ページネーション */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            {page * PAGE_SIZE + 1}〜{Math.min((page + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}件
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              前へ
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              次へ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
