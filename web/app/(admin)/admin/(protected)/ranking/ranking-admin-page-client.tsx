"use client";

import { useMemo, useState, useTransition } from "react";
import {
  backfillAction,
  deletePeriodAction,
  deleteRankingOverrideAction,
  refreshLatestBucketAction,
  refreshPeriodAction,
  resetKindAction,
  setCollectionEnabledAction,
  setPublicEnabledAction,
  upsertRankingOverrideAction,
} from "./actions";

// Prisma enum を client に直接 import すると node:module 依存が混入するため
// 文字列リテラル型で表現する（値も同じ文字列）
type RankingKind =
  | "TAROTIST"
  | "SPREAD"
  | "CATEGORY"
  | "CARD"
  | "PERSONAL_CATEGORY";

type Target = { id: string; name: string };

type ConfigState = {
  collectionEnabled: boolean;
  publicEnabled: boolean;
  updatedBy: string | null;
  updatedAt: string;
};

type KindSummary = {
  kind: RankingKind;
  latestPeriodEnd: string | null;
  bucketCount7d: number;
  bucketStarts7d: string[];
};

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
  config: initialConfig,
  summary,
  overrides: initialOverrides,
  targets,
}: {
  config: ConfigState;
  summary: KindSummary[];
  overrides: OverrideRow[];
  targets: Record<RankingKind, Target[]>;
}) {
  const [config, setConfig] = useState<ConfigState>(initialConfig);
  const [overrideRows, setOverrideRows] = useState(initialOverrides);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // 期間入力
  const now = new Date();
  const defaultFrom = toLocalInput(new Date(now.getTime() - 7 * 24 * 3600 * 1000));
  const defaultTo = toLocalInput(now);
  const [periodFrom, setPeriodFrom] = useState(defaultFrom);
  const [periodTo, setPeriodTo] = useState(defaultTo);
  const [periodKind, setPeriodKind] = useState<RankingKind | "">("");

  // Override フォーム
  const [formKind, setFormKind] = useState<RankingKind>("TAROTIST");
  const [formTargetId, setFormTargetId] = useState("");
  const [formRank, setFormRank] = useState(1);
  const [formActive, setFormActive] = useState(true);
  const [formNote, setFormNote] = useState("");

  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const k of KIND_ORDER) {
      for (const t of targets[k]) m.set(`${k}:${t.id}`, t.name);
    }
    return m;
  }, [targets]);

  const summaryMap = useMemo(() => {
    const m = new Map<RankingKind, KindSummary>();
    for (const s of summary) m.set(s.kind, s);
    return m;
  }, [summary]);

  function notify(res: { ok: true } | { ok: false; error: string }, okText: string) {
    if (!res.ok) {
      setMsg({ type: "err", text: res.error });
      return false;
    }
    setMsg({ type: "ok", text: okText });
    return true;
  }

  // --- Config ---

  function handleToggleCollection(next: boolean) {
    setBusy("collection");
    setMsg(null);
    startTransition(async () => {
      const res = await setCollectionEnabledAction(next);
      setBusy(null);
      if (!notify(res, `自動収集を ${next ? "ON" : "OFF"} にしました`)) return;
      setConfig((c) => ({ ...c, collectionEnabled: next, updatedAt: new Date().toISOString() }));
    });
  }

  function handleTogglePublic(next: boolean) {
    setBusy("public");
    setMsg(null);
    startTransition(async () => {
      const res = await setPublicEnabledAction(next);
      setBusy(null);
      if (!notify(res, `公開を ${next ? "ON" : "OFF"} にしました`)) return;
      setConfig((c) => ({ ...c, publicEnabled: next, updatedAt: new Date().toISOString() }));
    });
  }

  // --- 期間オペ ---

  function handleRefreshLatest() {
    if (!confirm("直前1時間バケットを集計しますか？")) return;
    setBusy("refreshLatest");
    setMsg(null);
    startTransition(async () => {
      const res = await refreshLatestBucketAction();
      setBusy(null);
      if (res.ok) {
        setMsg({
          type: "ok",
          text: `集計完了: ${res.result.kinds.map((k) => `${KIND_LABEL[k.kind]} ${k.count}件`).join(" / ")}`,
        });
        setTimeout(() => window.location.reload(), 800);
      } else {
        setMsg({ type: "err", text: res.error });
      }
    });
  }

  function handleRefreshPeriod() {
    if (!confirm(`${periodFrom} 〜 ${periodTo} のバケットを全て再収集しますか？\n（時間数が多いと時間がかかります）`)) return;
    setBusy("refreshPeriod");
    setMsg(null);
    startTransition(async () => {
      const res = await refreshPeriodAction({
        from: new Date(periodFrom).toISOString(),
        to: new Date(periodTo).toISOString(),
      });
      setBusy(null);
      if (res.ok) {
        setMsg({ type: "ok", text: `期間再収集完了: ${res.processed} バケット` });
        setTimeout(() => window.location.reload(), 800);
      } else {
        setMsg({ type: "err", text: res.error });
      }
    });
  }

  function handleDeletePeriod() {
    const kindLabel = periodKind ? KIND_LABEL[periodKind] : "全種別";
    if (!confirm(`${periodFrom} 〜 ${periodTo} の ${kindLabel} バケットを削除しますか？\nこの操作は元に戻せませんが、再収集で復元可能です。`)) return;
    setBusy("deletePeriod");
    setMsg(null);
    startTransition(async () => {
      const res = await deletePeriodAction({
        from: new Date(periodFrom).toISOString(),
        to: new Date(periodTo).toISOString(),
        kind: periodKind || undefined,
      });
      setBusy(null);
      if (res.ok) {
        setMsg({ type: "ok", text: `${res.deleted} バケットを削除しました` });
        setTimeout(() => window.location.reload(), 800);
      } else {
        setMsg({ type: "err", text: res.error });
      }
    });
  }

  function handleBackfill() {
    if (!confirm(`${periodFrom} 〜 ${periodTo} の欠損バケットを補完しますか？`)) return;
    setBusy("backfill");
    setMsg(null);
    startTransition(async () => {
      const res = await backfillAction({
        from: new Date(periodFrom).toISOString(),
        to: new Date(periodTo).toISOString(),
      });
      setBusy(null);
      if (res.ok) {
        setMsg({ type: "ok", text: `バックフィル完了: 補完 ${res.filled} / スキップ ${res.skipped}` });
        setTimeout(() => window.location.reload(), 800);
      } else {
        setMsg({ type: "err", text: res.error });
      }
    });
  }

  function handleResetKind(kind: RankingKind) {
    if (!confirm(`${KIND_LABEL[kind]} の全 Snapshot を削除します。本当によろしいですか？`)) return;
    setBusy(`reset-${kind}`);
    setMsg(null);
    startTransition(async () => {
      const res = await resetKindAction(kind);
      setBusy(null);
      if (res.ok) {
        setMsg({ type: "ok", text: `${KIND_LABEL[kind]} の ${res.deleted} バケットを削除しました` });
        setTimeout(() => window.location.reload(), 800);
      } else {
        setMsg({ type: "err", text: res.error });
      }
    });
  }

  // --- Override ---

  function handleSubmitOverride() {
    if (!formTargetId) {
      setMsg({ type: "err", text: "対象を選択してください" });
      return;
    }
    setMsg(null);
    setBusy("upsertOverride");
    startTransition(async () => {
      const res = await upsertRankingOverrideAction({
        kind: formKind,
        targetId: formTargetId,
        rank: formRank,
        isActive: formActive,
        note: formNote.trim() || null,
      });
      setBusy(null);
      if (res.ok) {
        setMsg({ type: "ok", text: "保存しました" });
        setTimeout(() => window.location.reload(), 600);
      } else {
        setMsg({ type: "err", text: res.error });
      }
    });
  }

  function handleDeleteOverride(row: OverrideRow) {
    const name = nameMap.get(`${row.kind}:${row.targetId}`) ?? row.targetId;
    if (!confirm(`${KIND_LABEL[row.kind]} の ${name} を編集部選出から削除しますか？`)) return;
    setMsg(null);
    setBusy(`delOv-${row.id}`);
    startTransition(async () => {
      const res = await deleteRankingOverrideAction(row.id);
      setBusy(null);
      if (res.ok) {
        setOverrideRows((prev) => prev.filter((r) => r.id !== row.id));
        setMsg({ type: "ok", text: "削除しました" });
      } else {
        setMsg({ type: "err", text: res.error });
      }
    });
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">ランキング管理</h1>
        <p className="text-sm text-slate-500 mt-1">
          自動集計・公開の切替、バケット（1時間粒度）の期間オペレーション、編集部選出の管理。
        </p>
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

      {/* (A) 設定 */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">設定</h2>
        <div className="flex flex-col gap-3">
          <ConfigToggle
            label="自動収集"
            desc="GitHub Actions の cron が直前1時間バケットを集計します（毎時15分）"
            enabled={config.collectionEnabled}
            onToggle={handleToggleCollection}
            busy={busy === "collection"}
          />
          <ConfigToggle
            label="公開"
            desc="/ranking ページと /api/ranking を公開します"
            enabled={config.publicEnabled}
            onToggle={handleTogglePublic}
            busy={busy === "public"}
          />
        </div>
        {config.updatedBy && (
          <p className="text-xs text-slate-400 mt-3">
            最終更新: {config.updatedBy}（{formatDateTime(config.updatedAt)}）
          </p>
        )}
      </section>

      {/* (B) 状態 */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">バケット状況</h2>
          <button
            onClick={handleRefreshLatest}
            disabled={busy === "refreshLatest"}
            className="text-xs rounded-lg bg-violet-700 text-white px-3 py-1.5 hover:bg-violet-800 disabled:opacity-50"
          >
            {busy === "refreshLatest" ? "集計中…" : "直前1時間を集計"}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {KIND_ORDER.map((k) => {
            const s = summaryMap.get(k);
            return (
              <div key={k} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">{KIND_LABEL[k]}</p>
                  <button
                    onClick={() => handleResetKind(k)}
                    disabled={busy === `reset-${k}`}
                    className="text-[11px] text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    リセット
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  最終バケット:{" "}
                  {s?.latestPeriodEnd ? formatDateTime(s.latestPeriodEnd) : "—"}
                </p>
                <p className="text-xs text-slate-500">
                  直近7日のバケット数: {s?.bucketCount7d ?? 0} / 168（期待値）
                </p>
                {s && s.bucketCount7d < 168 && s.bucketCount7d > 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    ⚠ 欠損があります（バックフィルを検討）
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* (C) 期間オペ */}
      <section className="mb-8 rounded-xl border border-violet-200 bg-violet-50 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">期間オペレーション</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">開始</label>
            <input
              type="datetime-local"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">終了</label>
            <input
              type="datetime-local"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              種別指定（削除時のみ適用。再収集・バックフィルは全種別）
            </label>
            <select
              value={periodKind}
              onChange={(e) => setPeriodKind(e.target.value as RankingKind | "")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">全種別</option>
              {KIND_ORDER.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleBackfill}
            disabled={busy === "backfill"}
            className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy === "backfill" ? "実行中…" : "⏪ バックフィル（欠損のみ）"}
          </button>
          <button
            onClick={handleRefreshPeriod}
            disabled={busy === "refreshPeriod"}
            className="rounded-lg bg-sky-700 text-white px-4 py-2 text-sm font-medium hover:bg-sky-800 disabled:opacity-50"
          >
            {busy === "refreshPeriod" ? "実行中…" : "🔁 期間再収集（削除→再計算）"}
          </button>
          <button
            onClick={handleDeletePeriod}
            disabled={busy === "deletePeriod"}
            className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {busy === "deletePeriod" ? "実行中…" : "🗑 期間削除"}
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-3">
          バケットは 1 時間粒度。開始・終了は時間境界に切り詰められます（例: 10:37 → 10:00）。
        </p>
      </section>

      {/* (D) Override */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          編集部選出（集計結果が薄い時のフォールバック）
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">種別</label>
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
              <label className="block text-xs font-medium text-slate-600 mb-1">対象</label>
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
              <label className="block text-xs font-medium text-slate-600 mb-1">表示順</label>
              <input
                type="number"
                min={1}
                value={formRank}
                onChange={(e) => setFormRank(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">有効</label>
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>
          </div>
          <div className="mt-4 text-right">
            <button
              onClick={handleSubmitOverride}
              disabled={busy === "upsertOverride"}
              className="rounded-lg bg-violet-700 text-white px-4 py-2 text-sm font-medium hover:bg-violet-800 disabled:opacity-50"
            >
              {busy === "upsertOverride" ? "保存中…" : "保存"}
            </button>
          </div>
        </div>

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
              {overrideRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-xs">
                    編集部選出はまだありません
                  </td>
                </tr>
              ) : (
                overrideRows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-700">{KIND_LABEL[r.kind]}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {nameMap.get(`${r.kind}:${r.targetId}`) ?? r.targetId}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{r.rank}</td>
                    <td className="px-4 py-2 text-slate-600">{r.isActive ? "✓" : "—"}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{r.note ?? ""}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleDeleteOverride(r)}
                        disabled={busy === `delOv-${r.id}`}
                        className="text-red-600 hover:text-red-700 text-xs disabled:opacity-50"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ConfigToggle({
  label,
  desc,
  enabled,
  onToggle,
  busy,
}: {
  label: string;
  desc: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        disabled={busy}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          enabled ? "bg-emerald-500" : "bg-slate-300"
        } ${busy ? "opacity-50" : ""}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function toLocalInput(d: Date): string {
  // datetime-local 用: "YYYY-MM-DDTHH:mm"
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
