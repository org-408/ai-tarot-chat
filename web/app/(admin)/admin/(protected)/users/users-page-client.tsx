"use client";

import { useState, useTransition } from "react";
import { removeAdminAction, sendInviteEmailAction } from "./actions";

type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: string;
};

export function UsersPageClient({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const [rows, setRows] = useState(users);
  const [inviteEmail, setInviteEmail] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRemove(user: AdminUserRow) {
    if (!confirm(`${user.email ?? user.id} の管理者権限を削除しますか？`)) return;
    setMsg(null);
    startTransition(async () => {
      const res = await removeAdminAction(user.id);
      if (!res.ok) { setMsg({ type: "err", text: res.error }); return; }
      setRows((prev) => prev.filter((r) => r.id !== user.id));
      setMsg({ type: "ok", text: `${user.email} の管理者権限を削除しました` });
    });
  }

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    if (!confirm(`${inviteEmail} に招待メールを送信しますか？`)) return;
    setMsg(null);
    startTransition(async () => {
      const res = await sendInviteEmailAction(inviteEmail.trim());
      if (!res.ok) { setMsg({ type: "err", text: res.error }); return; }
      setMsg({ type: "ok", text: `${inviteEmail} に管理者招待メールを送信しました` });
      setInviteEmail("");
    });
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">管理者ユーザー管理</h1>
        <p className="text-sm text-slate-500 mt-1">管理者の招待・削除を行います</p>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm mb-4 ${msg.type === "ok" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* 招待フォーム */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">管理者を招待する</h2>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            placeholder="admin@example.com"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={handleInvite}
            disabled={pending || !inviteEmail.trim()}
            className="rounded-lg bg-violet-700 text-white px-4 py-2 text-sm font-medium hover:bg-violet-800 disabled:opacity-50 transition-all"
          >
            {pending ? "送信中…" : "招待メール送信"}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          招待メール送信後、相手が管理画面から Google サインインすると管理者として利用できます。
        </p>
      </div>

      {/* 管理者一覧 */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
          <span className="text-sm font-medium text-slate-700">管理者 ({rows.length})</span>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400 px-4 py-3">管理者が登録されていません</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-500">ユーザー</th>
                <th className="text-left px-4 py-2 font-medium text-slate-500">登録日</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
                      )}
                      <div>
                        <div className="font-medium text-slate-800">{user.name ?? "—"}</div>
                        <div className="text-xs text-slate-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.id !== currentUserId ? (
                      <button
                        onClick={() => handleRemove(user)}
                        disabled={pending}
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        削除
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">自分</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
