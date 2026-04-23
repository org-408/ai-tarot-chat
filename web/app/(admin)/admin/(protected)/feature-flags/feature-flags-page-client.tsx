"use client";

import { useState, useTransition } from "react";
import { setFeatureFlagAction } from "./actions";

type FlagRow = {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  persisted: boolean;
};

export function FeatureFlagsPageClient({ flags }: { flags: FlagRow[] }) {
  const [rows, setRows] = useState(flags);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleToggle(flag: FlagRow) {
    const next = !flag.enabled;
    setPendingKey(flag.key);
    setMsg(null);
    startTransition(async () => {
      const res = await setFeatureFlagAction(flag.key, next);
      setPendingKey(null);
      if (!res.ok) {
        setMsg({ type: "err", text: res.error });
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.key === flag.key
            ? { ...r, enabled: next, persisted: true, updatedAt: new Date().toISOString() }
            : r
        )
      );
      setMsg({ type: "ok", text: `${flag.key} を ${next ? "有効" : "無効"} にしました` });
    });
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">機能フラグ管理</h1>
        <p className="text-sm text-slate-500 mt-1">
          機能の公開可否を切り替えます。切替は即時反映されます（公開ページは最大1時間のキャッシュ遅延あり）。
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

      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-slate-500">キー</th>
              <th className="text-left px-4 py-2 font-medium text-slate-500">説明</th>
              <th className="text-left px-4 py-2 font-medium text-slate-500">更新者</th>
              <th className="px-4 py-2 font-medium text-slate-500">状態</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => {
              const pending = pendingKey === f.key;
              return (
                <tr key={f.key} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 align-top">
                    {f.key}
                    {!f.persisted && (
                      <span className="ml-2 inline-block rounded bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5">
                        既定値
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs align-top">
                    {f.description ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs align-top">
                    {f.updatedBy ?? "—"}
                    {f.updatedAt && (
                      <div className="mt-0.5">{formatDateTime(f.updatedAt)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <button
                      onClick={() => handleToggle(f)}
                      disabled={pending}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        f.enabled ? "bg-emerald-500" : "bg-slate-300"
                      } ${pending ? "opacity-50" : ""}`}
                      aria-label={`${f.key} を切替`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          f.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
