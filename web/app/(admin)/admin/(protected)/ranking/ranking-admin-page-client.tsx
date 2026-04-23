"use client";

import { useMemo, useState, useTransition } from "react";
import {
  deleteRankingOverrideAction,
  refreshRankingAction,
  upsertRankingOverrideAction,
} from "./actions";

// Prisma enum 値をクライアントに直接 import すると node:module が混入するため
// 文字列リテラル型で表現する
type RankingKind =
  | "TAROTIST"
  | "SPREAD"
  | "CATEGORY"
  | "CARD"
  | "PERSONAL_CATEGORY";

type Target = { id: string; name: string };

type OverrideRow = {
  id: string;
  kind: RankingKind;
  targetId: string;
  rank: number;
  isActive: boolean;
  note: string | null;
  updatedBy: string | null;
  updatedAt: string;
};

type SnapshotSummary = {
  kind: RankingKind;
  generatedAt: string | null;
  entries: { targetId: string; count: number; rank: number }[];
};

const KIND_LABEL: Record<RankingKind, string> = {
  TAROTIST: "占い師",
  SPREAD: "スプレッド",
  CATEGORY: "ジャンル（全体）",
  CARD: "引かれたカード",
  PERSONAL_CATEGORY: "パーソナル占いのテーマ",
};

const KIND_ORDER: RankingKind[] = [
  "TAROTIST",
  "SPREAD",
  "CATEGORY",
  "CARD",
  "PERSONAL_CATEGORY",
];

export function RankingAdminPageClient({
  overrides,
  snapshots,
  targets,
}: {
  overrides: OverrideRow[];
  snapshots: SnapshotSummary[];
  targets: Record<RankingKind, Target[]>;
}) {
  const [rows, setRows] = useState(overrides);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);

  // フォーム状態
  const [formKind, setFormKind] = useState<RankingKind>("TAROTIST");
  const [formTargetId, setFormTargetId] = useState("");
  const [formRank, setFormRank] = useState(1);
  const [formActive, setFormActive] = useState(true);
  const [formNote, setFormNote] = useState("");

  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const k of KIND_ORDER) {
      for (const t of targets[k]) {
        m.set(`${k}:${t.id}`, t.name);
      }
    }
    return m;
  }, [targets]);

  const snapshotMap = useMemo(() => {
    const m = new Map<RankingKind, SnapshotSummary>();
    for (const s of snapshots) m.set(s.kind, s);
    return m;
  }, [snapshots]);

  function handleRefresh() {
    if (!confirm("全種別のランキングスナップショットを再集計しますか？")) return;
    setRefreshing(true);
    setMsg(null);
    startTransition(async () => {
      const res = await refreshRankingAction();
      setRefreshing(false);
      if (!res.ok) {
        setMsg({ type: "err", text: res.error });
        return;
      }
      setMsg({
        type: "ok",
        text: `再集計完了: ${res.result.kinds.map((k) => `${KIND_LABEL[k.kind]} ${k.count}件`).join(" / ")}`,
      });
    });
  }

  function handleSubmitOverride() {
    if (!formTargetId) {
      setMsg({ type: "err", text: "対象を選択してください" });
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const res = await upsertRankingOverrideAction({
        kind: formKind,
        targetId: formTargetId,
        rank: formRank,
        isActive: formActive,
        note: formNote.trim() || null,
      });
      if (!res.ok) {
        setMsg({ type: "err", text: res.error });
        return;
      }
      setMsg({ type: "ok", text: "保存しました" });
      // 再取得ではなくクライアント側で反映：簡易のためページリロード
      window.location.reload();
    });
  }

  function handleDelete(row: OverrideRow) {
    const name = nameMap.get(`${row.kind}:${row.targetId}`) ?? row.targetId;
    if (!confirm(`${KIND_LABEL[row.kind]} の ${name} を編集部選出から削除しますか？`)) return;
    setMsg(null);
    startTransition(async () => {
      const res = await deleteRankingOverrideAction(row.id);
      if (!res.ok) {
        setMsg({ type: "err", text: res.error });
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setMsg({ type: "ok", text: "削除しました" });
    });
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ランキング管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            スナップショットの状態確認と、編集部選出（フォールバック）の管理を行います。
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-lg bg-violet-700 text-white px-4 py-2 text-sm font-medium hover:bg-violet-800 disabled:opacity-50 transition-all"
        >
          {refreshing ? "再集計中…" : "スナップショット再集計"}
        </button>
      </div>

      {msg && (
        <div
          className={`rounded-lg px-4 py-3 text-sm mb-4 ${
            msg.type === "ok"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* スナップショット状況 */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          スナップショット状況
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {KIND_ORDER.map((k) => {
            const s = snapshotMap.get(k);
            return (
              <div
                key={k}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="text-sm font-medium text-slate-800">{KIND_LABEL[k]}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {s?.generatedAt
                    ? `最終集計: ${formatDateTime(s.generatedAt)}`
                    : "未集計"}
                </p>
                <p className="text-xs text-slate-500">
                  {s?.entries.length ?? 0} 件
                </p>
                {s && s.entries.length > 0 && (
                  <ol className="mt-2 text-xs text-slate-600 space-y-0.5">
                    {s.entries.slice(0, 3).map((e) => (
                      <li key={e.targetId} className="truncate">
                        {e.rank}. {nameMap.get(`${k}:${e.targetId}`) ?? e.targetId}（
                        {e.count}回）
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 編集部選出 追加フォーム */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          編集部選出を追加・更新
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          実データが少ない時期のフォールバック表示です。同じ種別×対象は上書きされます。
        </p>
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                種別
              </label>
              <select
                value={formKind}
                onChange={(e) => {
                  setFormKind(e.target.value as RankingKind);
                  setFormTargetId("");
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                {KIND_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                対象
              </label>
              <select
                value={formTargetId}
                onChange={(e) => setFormTargetId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">選択してください</option>
                {targets[formKind].map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                表示順
              </label>
              <input
                type="number"
                min={1}
                value={formRank}
                onChange={(e) => setFormRank(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                有効
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                />
                表示する
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                メモ（運営用・任意）
              </label>
              <input
                type="text"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="例: 春キャンペーンで推す"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>
          </div>
          <div className="mt-4 text-right">
            <button
              onClick={handleSubmitOverride}
              className="rounded-lg bg-violet-700 text-white px-4 py-2 text-sm font-medium hover:bg-violet-800 transition-all"
            >
              保存
            </button>
          </div>
        </div>
      </section>

      {/* 編集部選出 一覧 */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          編集部選出 一覧（{rows.length}件）
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center rounded-xl border border-dashed border-slate-300">
            編集部選出はまだありません
          </p>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">種別</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">対象</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">順位</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">有効</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">メモ</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-700">
                      {KIND_LABEL[r.kind]}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {nameMap.get(`${r.kind}:${r.targetId}`) ?? r.targetId}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{r.rank}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {r.isActive ? "✓" : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs">
                      {r.note ?? ""}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleDelete(r)}
                        className="text-red-600 hover:text-red-700 text-xs"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}
