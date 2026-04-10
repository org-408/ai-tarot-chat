"use client";

import { useState, useTransition } from "react";
import { changeUserRoleAction, sendInviteEmailAction } from "./actions";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  createdAt: string;
};

export function UsersPageClient({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [rows, setRows] = useState(users);
  const [inviteEmail, setInviteEmail] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRoleToggle(user: UserRow) {
    const next = user.role === "ADMIN" ? "USER" : "ADMIN";
    if (!confirm(`${user.email} のロールを ${next} に変更しますか？`)) return;
    setMsg(null);
    startTransition(async () => {
      const res = await changeUserRoleAction(user.id, next);
      if (!res.ok) { setMsg({ type: "err", text: res.error }); return; }
      setRows((prev) => prev.map((r) => r.id === user.id ? { ...r, role: next } : r));
      setMsg({ type: "ok", text: `${user.email} のロールを ${next} に変更しました` });
    });
  }

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    if (!confirm(`${inviteEmail} に招待メールを送信しますか？`)) return;
    setMsg(null);
    startTransition(async () => {
      const res = await sendInviteEmailAction(inviteEmail.trim());
      if (!res.ok) { setMsg({ type: "err", text: res.error }); return; }
      const text = res.promoted
        ? `${inviteEmail} を ADMIN に昇格し、招待メールを送信しました`
        : `${inviteEmail} に招待メールを送信しました（アカウント未登録）`;
      setMsg({ type: "ok", text });
      setInviteEmail("");
      // 昇格した場合はリストを更新
      if (res.promoted) {
        setRows((prev) => prev.map((r) => r.email === inviteEmail.trim() ? { ...r, role: "ADMIN" } : r));
      }
    });
  }

  const admins = rows.filter((r) => r.role === "ADMIN");
  const others = rows.filter((r) => r.role !== "ADMIN");

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">管理者ユーザー管理</h1>
        <p className="text-sm text-slate-500 mt-1">管理者の招待・ロール変更を行います</p>
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
          既存ユーザーは自動で ADMIN に昇格します。未登録の場合は Google サインイン後に管理者が手動でロール変更してください。
        </p>
      </div>

      {/* 管理者一覧 */}
      <Section title={`管理者 (${admins.length})`} users={admins} currentUserId={currentUserId} onToggle={handleRoleToggle} pending={pending} />

      {/* 一般ユーザー一覧 */}
      {others.length > 0 && (
        <div className="mt-6">
          <Section title={`一般ユーザー (${others.length})`} users={others} currentUserId={currentUserId} onToggle={handleRoleToggle} pending={pending} />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  users,
  currentUserId,
  onToggle,
  pending,
}: {
  title: string;
  users: UserRow[];
  currentUserId: string;
  onToggle: (u: UserRow) => void;
  pending: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
        <span className="text-sm font-medium text-slate-700">{title}</span>
      </div>
      {users.length === 0 ? (
        <p className="text-sm text-slate-400 px-4 py-3">なし</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-slate-500">ユーザー</th>
              <th className="text-left px-4 py-2 font-medium text-slate-500">ロール</th>
              <th className="text-left px-4 py-2 font-medium text-slate-500">登録日</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
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
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${user.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                </td>
                <td className="px-4 py-3 text-right">
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => onToggle(user)}
                      disabled={pending}
                      className="text-xs text-violet-600 hover:text-violet-800 disabled:opacity-50"
                    >
                      {user.role === "ADMIN" ? "降格" : "管理者に昇格"}
                    </button>
                  )}
                  {user.id === currentUserId && (
                    <span className="text-xs text-slate-400">自分</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
