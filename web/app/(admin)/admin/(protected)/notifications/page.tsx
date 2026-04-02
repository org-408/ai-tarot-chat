"use client";

import { useState } from "react";

type Subscriber = {
  id: string;
  email: string;
  platform: string | null;
  notifiedAt: string | null;
  createdAt: string;
};

type FetchState = "idle" | "loading" | "done" | "error";
type SendState = "idle" | "loading" | "done" | "error";

export default function NotificationsPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [sendResult, setSendResult] = useState<{ sent?: number; dryRun?: boolean; count?: number; errors?: string[] } | null>(null);
  const [secret, setSecret] = useState("");
  const [platform, setPlatform] = useState("all");
  const [errorMsg, setErrorMsg] = useState("");

  async function fetchSubscribers() {
    if (!secret) { setErrorMsg("Admin Secret を入力してください"); return; }
    setFetchState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/notify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${secret}` },
        body: JSON.stringify({ platform, dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "取得失敗"); setFetchState("error"); return; }
      if (data.dryRun) {
        const list: Subscriber[] = (data.emails as string[]).map((email, i) => ({
          id: String(i),
          email,
          platform: null,
          notifiedAt: null,
          createdAt: "",
        }));
        setSubscribers(list);
      } else {
        setSubscribers([]);
      }
      setFetchState("done");
    } catch {
      setErrorMsg("ネットワークエラー");
      setFetchState("error");
    }
  }

  async function sendNotifications(dryRun: boolean) {
    if (!secret) { setErrorMsg("Admin Secret を入力してください"); return; }
    setSendState("loading");
    setSendResult(null);
    setErrorMsg("");
    try {
      const res = await fetch("/api/notify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${secret}` },
        body: JSON.stringify({ platform, dryRun }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "送信失敗"); setSendState("error"); return; }
      setSendResult(data);
      setSendState("done");
    } catch {
      setErrorMsg("ネットワークエラー");
      setSendState("error");
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">リリース通知</h1>
      <p className="text-sm text-slate-500 mb-6">
        メール通知登録者への一斉送信を管理します。
      </p>

      {/* 認証 */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-6">
        <label className="text-sm font-medium text-slate-700 block mb-1">Admin Secret</label>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="ADMIN_API_SECRET の値"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
        />
      </div>

      {/* フィルタ */}
      <div className="flex gap-2 mb-6">
        {["all", "ios", "android", "both"].map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              platform === p
                ? "bg-purple-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {p === "all" ? "全員" : p === "ios" ? " iOS" : p === "android" ? "🤖 Android" : "両方"}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">
          {errorMsg}
        </div>
      )}

      {/* 操作ボタン */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={fetchSubscribers}
          disabled={fetchState === "loading"}
          className="rounded-lg bg-slate-700 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-60 transition-all"
        >
          {fetchState === "loading" ? "取得中…" : "登録者をプレビュー"}
        </button>
        <button
          onClick={() => sendNotifications(true)}
          disabled={sendState === "loading"}
          className="rounded-lg bg-amber-500 text-white px-4 py-2 text-sm font-medium hover:bg-amber-600 disabled:opacity-60 transition-all"
        >
          ドライラン（実際には送らない）
        </button>
        <button
          onClick={() => {
            if (confirm("本当に送信しますか？")) sendNotifications(false);
          }}
          disabled={sendState === "loading"}
          className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium hover:bg-purple-800 disabled:opacity-60 transition-all"
        >
          {sendState === "loading" ? "送信中…" : "📨 メール送信"}
        </button>
      </div>

      {/* 送信結果 */}
      {sendResult && (
        <div className={`rounded-xl border p-4 mb-6 ${sendResult.dryRun ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
          {sendResult.dryRun ? (
            <p className="text-amber-800 font-medium">
              ドライラン: 送信対象 <strong>{sendResult.count}</strong> 件
            </p>
          ) : (
            <p className="text-green-800 font-medium">
              送信完了: <strong>{sendResult.sent}</strong> 件
            </p>
          )}
          {sendResult.errors && sendResult.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-red-700 text-sm font-medium">エラー ({sendResult.errors.length} 件):</p>
              <ul className="text-xs text-red-600 mt-1 space-y-0.5">
                {sendResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 登録者リスト */}
      {fetchState === "done" && subscribers.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
            <span className="text-sm font-medium text-slate-700">
              未送信の登録者 ({subscribers.length} 件)
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {subscribers.map((s) => (
              <li key={s.id} className="px-4 py-2.5 text-sm text-slate-700">
                {s.email}
              </li>
            ))}
          </ul>
        </div>
      )}
      {fetchState === "done" && subscribers.length === 0 && (
        <p className="text-sm text-slate-500">未送信の登録者はいません。</p>
      )}
    </div>
  );
}
