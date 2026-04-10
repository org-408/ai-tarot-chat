"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { getBatchDetailAction, resendUnsentAction } from "./actions";

type SentRecord = {
  id: string;
  email: string;
  status: string;
  error: string | null;
  sentAt: string;
};

type UnsentRecord = {
  id: string;
  email: string;
  platform: string | null;
};

type Batch = {
  id: string;
  title: string;
  body: string;
  platform: string;
  sentAt: string | null;
  totalSent: number;
  totalFailed: number;
  createdAt: string;
};

const PLATFORM_LABELS: Record<string, string> = {
  all: "全員",
  ios: "iOS",
  android: "Android",
  both: "両方",
};

export function BatchDetailClient({ batchId }: { batchId: string }) {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [sents, setSents] = useState<SentRecord[]>([]);
  const [unsent, setUnsent] = useState<UnsentRecord[]>([]);
  const [tab, setTab] = useState<"success" | "failed" | "unsent">("success");
  const [errorMsg, setErrorMsg] = useState("");
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  const [loading, startLoading] = useTransition();
  const [sending, startSending] = useTransition();

  useEffect(() => {
    startLoading(async () => {
      const result = await getBatchDetailAction(batchId);
      if (!result.ok) { setErrorMsg(result.error); return; }
      setBatch(result.batch);
      setSents(result.sents);
      setUnsent(result.unsent);
    });
  }, [batchId]);

  function handleResend() {
    if (!confirm(`未送信 ${unsent.length} 件に再送します。よろしいですか？`)) return;
    setErrorMsg("");
    setSendResult(null);
    startSending(async () => {
      const result = await resendUnsentAction(batchId);
      if (!result.ok) { setErrorMsg(result.error); return; }
      setSendResult({ sent: result.sent, failed: result.failed });
      // 再読み込み
      startLoading(async () => {
        const detail = await getBatchDetailAction(batchId);
        if (!detail.ok) return;
        setBatch(detail.batch);
        setSents(detail.sents);
        setUnsent(detail.unsent);
      });
    });
  }

  const succeeded = sents.filter((s) => s.status === "success");
  const failed = sents.filter((s) => s.status === "failed");

  if (loading && !batch) {
    return <div className="p-6 text-sm text-slate-400">読み込み中…</div>;
  }

  if (!batch) {
    return (
      <div className="p-6">
        <p className="text-red-600 text-sm">{errorMsg || "バッチが見つかりません"}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-4">
        <Link href="/admin/notifications" className="text-sm text-slate-400 hover:text-slate-600">
          ← リリース通知
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{batch.title}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
              <span className="rounded px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium">
                {PLATFORM_LABELS[batch.platform] ?? batch.platform}
              </span>
              <span>
                {batch.sentAt
                  ? `送信: ${new Date(batch.sentAt).toLocaleString("ja-JP")}`
                  : "未送信"}
              </span>
            </div>
          </div>
          <div className="flex gap-4 text-center shrink-0">
            <div>
              <p className="text-2xl font-bold text-green-600">{batch.totalSent}</p>
              <p className="text-xs text-slate-400">送信成功</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{batch.totalFailed}</p>
              <p className="text-xs text-slate-400">失敗</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-500">{unsent.length}</p>
              <p className="text-xs text-slate-400">未送信</p>
            </div>
          </div>
        </div>
        <div className="mt-4 bg-slate-50 rounded-lg p-3">
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{batch.body}</p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">
          {errorMsg}
        </div>
      )}

      {sendResult && (
        <div className="rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 mb-4">
          再送完了: 成功 <strong>{sendResult.sent}</strong> 件、失敗 <strong>{sendResult.failed}</strong> 件
        </div>
      )}

      {unsent.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 mb-4 flex items-center justify-between">
          <p className="text-sm text-amber-800">
            <strong>{unsent.length} 件</strong>の登録者がこのバッチを受信していません。
          </p>
          <button
            onClick={handleResend}
            disabled={sending}
            className="rounded-lg bg-amber-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-amber-700 disabled:opacity-60 transition-all"
          >
            {sending ? "送信中…" : "未受信者に再送"}
          </button>
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {([
          { key: "success", label: `送信済み (${succeeded.length})` },
          { key: "failed", label: `失敗 (${failed.length})` },
          { key: "unsent", label: `未送信 (${unsent.length})` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "success" && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {succeeded.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">送信済みのメールはありません。</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {succeeded.map((s) => (
                <li key={s.id} className="px-4 py-2.5 text-sm flex justify-between">
                  <span className="text-slate-700">{s.email}</span>
                  <span className="text-slate-400">{new Date(s.sentAt).toLocaleString("ja-JP")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "failed" && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {failed.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">失敗したメールはありません。</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {failed.map((s) => (
                <li key={s.id} className="px-4 py-2.5 text-sm">
                  <div className="text-slate-700">{s.email}</div>
                  {s.error && <div className="text-xs text-red-500 mt-0.5">{s.error}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "unsent" && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {unsent.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">未送信の登録者はいません。</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {unsent.map((s) => (
                <li key={s.id} className="px-4 py-2.5 text-sm text-slate-700">
                  {s.email}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
