"use client";

import { useState, useTransition } from "react";
import { verifyCodeAction } from "./actions";

export function PendingWithCodeInput({ email }: { email: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setError("6桁のコードを入力してください");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await verifyCodeAction(trimmed);
      if (!res.ok) {
        setError(res.error);
      }
      // ok の場合は redirect() が発火するためここには到達しない
    });
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">📧</div>
          <h1 className="text-2xl font-bold text-slate-800">確認コードを入力</h1>
          <p className="text-sm text-slate-500">
            <span className="font-medium text-slate-700">{email}</span> に送信された
            <br />6桁のコードを入力してください
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="123456"
            className="w-full text-center text-2xl tracking-[0.5em] font-mono rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
            disabled={pending}
          />
          <button
            onClick={handleSubmit}
            disabled={pending || code.length !== 6}
            className="w-full h-12 bg-violet-700 hover:bg-violet-800 text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            {pending ? "確認中…" : "確認する"}
          </button>
        </div>

        <p className="text-xs text-center text-slate-400">
          コードの有効期限は15分です
        </p>
      </div>
    </div>
  );
}

export function PendingWaiting({ email }: { email: string }) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">⏳</div>
          <h1 className="text-2xl font-bold text-slate-800">管理者の承認待ち</h1>
          <p className="text-sm text-slate-500">
            <span className="font-medium text-slate-700">{email}</span> は
            <br />まだ管理者として有効化されていません
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-sm px-4 py-3 space-y-2">
          <p>以下のいずれかで有効化されます:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>既存管理者から招待コード（6桁）を受け取って入力</li>
            <li>既存管理者が DB 上で直接有効化</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
