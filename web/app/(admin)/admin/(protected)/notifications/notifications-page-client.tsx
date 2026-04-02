"use client";

import type { NotificationPlatform } from "@/lib/server/services/notification";
import { useState, useTransition } from "react";
import {
  previewNotificationTargetsAction,
  sendNotificationsAction,
} from "./actions";

type Subscriber = {
  id: string;
  email: string;
  platform: string | null;
  notifiedAt: string | null;
  createdAt: string;
};

type SendResult =
  | { sent: number; errors?: string[] }
  | null;

export function NotificationsPageClient() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [platform, setPlatform] = useState<NotificationPlatform>("all");
  const [errorMsg, setErrorMsg] = useState("");
  const [sendResult, setSendResult] = useState<SendResult>(null);
  const [fetchPending, startFetchTransition] = useTransition();
  const [sendPending, startSendTransition] = useTransition();

  function fetchSubscribers() {
    setErrorMsg("");
    startFetchTransition(async () => {
      const result = await previewNotificationTargetsAction(platform);
      if (!result.ok) {
        setErrorMsg(result.error);
        return;
      }
      setSubscribers(result.subscribers);
    });
  }

  function sendNotifications() {
    setErrorMsg("");
    setSendResult(null);
    startSendTransition(async () => {
      const result = await sendNotificationsAction(platform);
      if (!result.ok) {
        setErrorMsg(result.error);
        return;
      }
      setSendResult({ sent: result.sent, errors: result.errors.length ? result.errors : undefined });
      setSubscribers([]);
    });
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">リリース通知</h1>
      <p className="text-sm text-slate-500 mb-6">
        メール通知登録者への一斉送信を管理します。
      </p>

      <div className="flex gap-2 mb-6">
        {["all", "ios", "android", "both"].map((value) => (
          <button
            key={value}
            onClick={() => setPlatform(value as NotificationPlatform)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              platform === value
                ? "bg-purple-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {value === "all"
              ? "全員"
              : value === "ios"
                ? "iOS"
                : value === "android"
                  ? "Android"
                  : "両方"}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={fetchSubscribers}
          disabled={fetchPending}
          className="rounded-lg bg-slate-700 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-60 transition-all"
        >
          {fetchPending ? "取得中…" : "登録者をプレビュー"}
        </button>
        <button
          onClick={() => {
            if (confirm("本当に送信しますか？")) sendNotifications();
          }}
          disabled={sendPending}
          className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium hover:bg-purple-800 disabled:opacity-60 transition-all"
        >
          {sendPending ? "送信中…" : "📨 メール送信"}
        </button>
      </div>

      {sendResult && (
        <div className="rounded-xl border p-4 mb-6 bg-green-50 border-green-200">
          <p className="text-green-800 font-medium">
            送信完了: <strong>{sendResult.sent}</strong> 件
          </p>
          {sendResult.errors && sendResult.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-red-700 text-sm font-medium">
                エラー ({sendResult.errors.length} 件):
              </p>
              <ul className="text-xs text-red-600 mt-1 space-y-0.5">
                {sendResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {subscribers.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
            <span className="text-sm font-medium text-slate-700">
              未送信の登録者 ({subscribers.length} 件)
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {subscribers.map((subscriber) => (
              <li key={subscriber.id} className="px-4 py-2.5 text-sm text-slate-700">
                {subscriber.email}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!fetchPending && subscribers.length === 0 && !errorMsg && (
        <p className="text-sm text-slate-500">プレビューすると対象者を確認できます。</p>
      )}
    </div>
  );
}
