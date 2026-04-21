"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import type { NotificationPlatform } from "@/lib/server/services/notification";
import {
  listBatchesAction,
  listSubscribersAction,
  sendNewBatchAction,
} from "./actions";

type Batch = {
  id: string;
  title: string;
  platform: string;
  sentAt: string | null;
  totalSent: number;
  totalFailed: number;
  createdAt: string;
};

type Subscriber = {
  id: string;
  email: string;
  platform: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
};

const PLATFORMS: { value: NotificationPlatform; label: string }[] = [
  { value: "all", label: "全員" },
  { value: "ios", label: "iOS" },
  { value: "android", label: "Android" },
  { value: "both", label: "両方" },
];

function PlatformBadge({ platform }: { platform: string }) {
  const labels: Record<string, string> = {
    all: "全員",
    ios: "iOS",
    android: "Android",
    both: "両方",
  };
  return (
    <span className="rounded px-2 py-0.5 text-xs bg-purple-100 text-purple-700 font-medium">
      {labels[platform] ?? platform}
    </span>
  );
}

export function NotificationsPageClient() {
  const [tab, setTab] = useState<"batches" | "subscribers">("batches");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", platform: "all" as NotificationPlatform });
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; errors?: string[] } | null>(null);

  const [loading, startLoading] = useTransition();
  const [sending, startSending] = useTransition();

  useEffect(() => {
    if (tab === "batches") loadBatches();
    else loadSubscribers();
  }, [tab]);

  function loadBatches() {
    setErrorMsg("");
    startLoading(async () => {
      const result = await listBatchesAction();
      if (!result.ok) { setErrorMsg(result.error); return; }
      setBatches(result.batches);
    });
  }

  function loadSubscribers() {
    setErrorMsg("");
    startLoading(async () => {
      const result = await listSubscribersAction();
      if (!result.ok) { setErrorMsg(result.error); return; }
      setSubscribers(result.subscribers);
    });
  }

  function handleSend() {
    if (!form.title.trim() || !form.body.trim()) {
      setErrorMsg("タイトルと本文を入力してください");
      return;
    }
    if (!confirm(`「${form.title}」を送信します。よろしいですか？`)) return;
    setErrorMsg("");
    setSendResult(null);
    startSending(async () => {
      const result = await sendNewBatchAction(form.title, form.body, form.platform);
      if (!result.ok) { setErrorMsg(result.error); return; }
      setSendResult({ sent: result.sent, failed: result.failed, errors: result.errors.length ? result.errors : undefined });
      setShowForm(false);
      setForm({ title: "", body: "", platform: "all" });
      loadBatches();
    });
  }

  const active = subscribers.filter((s) => !s.unsubscribedAt);
  const unsubscribed = subscribers.filter((s) => s.unsubscribedAt);

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">リリース通知</h1>
          <p className="text-sm text-slate-500 mt-1">メール通知の送信履歴と登録者を管理します</p>
        </div>
        {tab === "batches" && (
          <button
            onClick={() => { setShowForm(!showForm); setErrorMsg(""); setSendResult(null); }}
            className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium hover:bg-purple-800 transition-all"
          >
            {showForm ? "キャンセル" : "📨 新規送信"}
          </button>
        )}
      </div>

      {/* タブ */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {(["batches", "subscribers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "batches" ? "送信バッチ" : `登録者 ${subscribers.length > 0 ? `(${active.length}件)` : ""}`}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">
          {errorMsg}
        </div>
      )}

      {sendResult && (
        <div className="rounded-xl border p-4 mb-4 bg-green-50 border-green-200">
          <p className="text-green-800 font-medium">
            送信完了: <strong>{sendResult.sent}</strong> 件
            {sendResult.failed > 0 && <span className="text-red-700 ml-2">失敗: {sendResult.failed} 件</span>}
          </p>
          {sendResult.errors && (
            <ul className="text-xs text-red-600 mt-2 space-y-0.5">
              {sendResult.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* 新規送信フォーム */}
      {showForm && tab === "batches" && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">新規メール送信</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">件名・タイトル</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="例：AI Tarot Chatアプリがリリースされました"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">本文</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={5}
                placeholder="メール本文を入力してください..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">送信対象</label>
              <div className="flex gap-2">
                {PLATFORMS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setForm({ ...form, platform: value })}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                      form.platform === value
                        ? "bg-purple-700 text-white"
                        : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSend}
                disabled={sending}
                className="rounded-lg bg-purple-700 text-white px-5 py-2 text-sm font-medium hover:bg-purple-800 disabled:opacity-60 transition-all"
              >
                {sending ? "送信中…" : "送信する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* バッチ一覧 */}
      {tab === "batches" && (
        loading ? (
          <p className="text-sm text-slate-400">読み込み中…</p>
        ) : batches.length === 0 ? (
          <p className="text-sm text-slate-400">送信履歴がありません。</p>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">タイトル</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">対象</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">送信数</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">失敗</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">送信日時</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{batch.title}</td>
                    <td className="px-4 py-3">
                      <PlatformBadge platform={batch.platform} />
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium">{batch.totalSent}</td>
                    <td className="px-4 py-3 text-right text-red-600">{batch.totalFailed || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {batch.sentAt
                        ? new Date(batch.sentAt).toLocaleString("ja-JP")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/notifications/${batch.id}`}
                        className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                      >
                        詳細 →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* 登録者一覧 */}
      {tab === "subscribers" && (
        loading ? (
          <p className="text-sm text-slate-400">読み込み中…</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">有効な登録者 ({active.length} 件)</span>
              </div>
              {active.length === 0 ? (
                <p className="text-sm text-slate-400 px-4 py-3">登録者がいません。</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-slate-500">メールアドレス</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-500">プラットフォーム</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-500">登録日</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {active.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-700">{s.email}</td>
                        <td className="px-4 py-2">
                          <PlatformBadge platform={s.platform ?? "both"} />
                        </td>
                        <td className="px-4 py-2 text-slate-400">
                          {new Date(s.createdAt).toLocaleDateString("ja-JP")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {unsubscribed.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
                  <span className="text-sm font-medium text-slate-500">配信停止済み ({unsubscribed.length} 件)</span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {unsubscribed.map((s) => (
                    <li key={s.id} className="px-4 py-2 text-sm text-slate-400 flex justify-between">
                      <span>{s.email}</span>
                      <span>{s.unsubscribedAt ? new Date(s.unsubscribedAt).toLocaleDateString("ja-JP") : ""} 停止</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
