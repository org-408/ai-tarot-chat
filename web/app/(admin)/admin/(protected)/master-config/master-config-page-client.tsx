"use client";

import { useState, useTransition } from "react";
import { bumpMasterVersionAction } from "./actions";

type MasterConfigRow = {
  id: string;
  key: string;
  version: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

interface MasterConfigPageClientProps {
  configs: MasterConfigRow[];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function MasterConfigPageClient({
  configs,
}: MasterConfigPageClientProps) {
  const latest = configs[0] ?? null;
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);

  function handleBump() {
    if (
      !confirm(
        "MASTER_VERSION を更新します。モバイル全端末が次回起動時に最新マスターデータを再取得します。続行してよろしいですか?",
      )
    ) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await bumpMasterVersionAction(note || undefined);
      if (result.ok) {
        setNote("");
        setMessage({
          kind: "success",
          text: `バージョンを更新しました: ${result.version}`,
        });
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    });
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">マスターデータ管理</h1>
        <p className="text-sm text-slate-600 mt-1">
          モバイルクライアントに最新マスターデータを再取得させる
          <code className="px-1 text-xs">MASTER_VERSION</code> を管理します。
          バージョンが更新されると、モバイルアプリは次回起動時 (または
          フォアグラウンド復帰時) の
          <code className="px-1 text-xs">/api/masters/check-update</code>{" "}
          で差分を検知し、<code className="px-1 text-xs">/api/masters</code>{" "}
          から最新データを自動フェッチします。
        </p>
      </div>

      <section className="border rounded-lg p-4 bg-white">
        <h2 className="text-lg font-semibold mb-2">現在のバージョン</h2>
        {latest ? (
          <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
            <dt className="text-slate-500">Version</dt>
            <dd className="font-mono">{latest.version}</dd>
            <dt className="text-slate-500">更新日時</dt>
            <dd>{formatDate(latest.updatedAt)}</dd>
            <dt className="text-slate-500">メモ</dt>
            <dd>{latest.description || "—"}</dd>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">
            まだバージョン履歴がありません
          </p>
        )}
      </section>

      <section className="border rounded-lg p-4 bg-white space-y-3">
        <h2 className="text-lg font-semibold">モバイル再フェッチを強制</h2>
        <p className="text-sm text-slate-600">
          このボタンを押すと <code>MasterConfig</code> テーブルに新しい行が 1 件
          追加され、<code>MASTER_VERSION</code> が更新されます。モバイル各端末は
          次回起動時に更新を検知し、最新マスターデータ (AI
          プロンプト翻訳・カード内容・スプレッド等) を自動的に取得します。
        </p>
        <div>
          <label className="block text-sm text-slate-700 mb-1">
            メモ (任意、履歴に残ります)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例: Phase 2.1 翻訳ロールアウト"
            className="w-full border rounded px-3 py-2 text-sm"
            disabled={pending}
            maxLength={200}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBump}
            disabled={pending}
            className="px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {pending ? "更新中..." : "バージョンを更新する"}
          </button>
          {message && (
            <span
              className={
                message.kind === "success"
                  ? "text-sm text-emerald-700"
                  : "text-sm text-red-700"
              }
            >
              {message.text}
            </span>
          )}
        </div>
      </section>

      <section className="border rounded-lg p-4 bg-white">
        <h2 className="text-lg font-semibold mb-2">更新履歴</h2>
        {configs.length === 0 ? (
          <p className="text-sm text-slate-500">履歴なし</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-4 text-slate-500 font-medium">
                    時刻
                  </th>
                  <th className="py-2 pr-4 text-slate-500 font-medium">
                    バージョン
                  </th>
                  <th className="py-2 pr-4 text-slate-500 font-medium">
                    メモ
                  </th>
                </tr>
              </thead>
              <tbody>
                {configs.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap text-slate-600">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-700">
                      {c.version}
                    </td>
                    <td className="py-2 pr-4 text-slate-700">
                      {c.description || "—"}
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
