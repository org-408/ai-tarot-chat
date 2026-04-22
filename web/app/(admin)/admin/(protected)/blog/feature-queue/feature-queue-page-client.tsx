"use client";

import { useState, useTransition } from "react";
import { FeatureQueueStatus } from "@/lib/generated/prisma/enums";

type FeatureQueueItem = {
  id: string;
  description: string;
  status: FeatureQueueStatus;
  sortOrder: number;
  publishedAt: string | null;
  blogPostId: string | null;
  createdAt: string;
};

type Props = {
  initialItems: FeatureQueueItem[];
  initialPendingCount: number;
};

export function FeatureQueuePageClient({ initialItems, initialPendingCount }: Props) {
  const [items, setItems] = useState<FeatureQueueItem[]>(initialItems);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const [activeTab, setActiveTab] = useState<FeatureQueueStatus>(FeatureQueueStatus.PENDING);
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredItems = items.filter((item) => item.status === activeTab);
  const LOW_QUEUE_THRESHOLD = 5;

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  async function refreshItems() {
    const res = await fetch("/api/admin/feature-queue");
    if (!res.ok) return;
    const data: FeatureQueueItem[] = await res.json();
    setItems(data);
    setPendingCount(data.filter((i) => i.status === FeatureQueueStatus.PENDING).length);
  }

  function handleSeedDefaults() {
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/admin/feature-queue/seed", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "インポートに失敗しました");
        return;
      }
      const { count } = await res.json();
      await refreshItems();
      setActiveTab(FeatureQueueStatus.PENDING);
      showSuccess(`デフォルト機能 ${count} 件をインポートしました（既存の PENDING は削除されました）`);
    });
  }

  function handleAdd() {
    if (!newDescription.trim()) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/admin/feature-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: newDescription.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "追加に失敗しました");
        return;
      }
      setNewDescription("");
      await refreshItems();
      setActiveTab(FeatureQueueStatus.PENDING);
      showSuccess("機能を追加しました");
    });
  }

  function startEdit(item: FeatureQueueItem) {
    setEditingId(item.id);
    setEditingText(item.description);
  }

  function handleEditSave(id: string) {
    if (!editingText.trim()) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/admin/feature-queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editingText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "更新に失敗しました");
        return;
      }
      setEditingId(null);
      await refreshItems();
      showSuccess("更新しました");
    });
  }

  function handleDelete(id: string) {
    if (!confirm("このアイテムを削除しますか？")) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/admin/feature-queue/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "削除に失敗しました");
        return;
      }
      await refreshItems();
      showSuccess("削除しました");
    });
  }

  function handleReorder(id: string, direction: "up" | "down") {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/admin/feature-queue/${id}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "並び替えに失敗しました");
        return;
      }
      await refreshItems();
    });
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">機能紹介キュー</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            BUILD_IN_PUBLIC ブログ記事の自動生成に使われる機能説明のキューです
          </p>
        </div>
        <button
          onClick={handleSeedDefaults}
          disabled={isPending}
          className="px-3 py-1.5 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50 transition"
        >
          デフォルト機能をインポート
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          {successMessage}
        </div>
      )}

      {/* PENDING残件数バッジ */}
      <div className={`text-sm font-medium px-3 py-2 rounded-md inline-flex items-center gap-2 ${
        pendingCount <= LOW_QUEUE_THRESHOLD
          ? "bg-amber-100 text-amber-700"
          : "bg-slate-100 text-slate-600"
      }`}>
        <span>PENDING 残り</span>
        <span className="font-bold">{pendingCount} 件</span>
        {pendingCount <= LOW_QUEUE_THRESHOLD && <span>— キューが少なくなっています</span>}
      </div>

      {/* タブ */}
      <div className="flex gap-2 border-b">
        {([FeatureQueueStatus.PENDING, FeatureQueueStatus.PUBLISHED] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              activeTab === tab
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === FeatureQueueStatus.PENDING ? "PENDING" : "PUBLISHED"}
            <span className="ml-1.5 text-xs text-slate-400">
              ({items.filter((i) => i.status === tab).length})
            </span>
          </button>
        ))}
      </div>

      {/* リスト */}
      <div className="space-y-2">
        {filteredItems.length === 0 && (
          <p className="text-sm text-slate-400 py-4 text-center">アイテムがありません</p>
        )}
        {filteredItems.map((item, index) => (
          <div
            key={item.id}
            className="border rounded-md p-3 bg-white space-y-2"
          >
            {editingId === item.id ? (
              <div className="space-y-2">
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className="w-full text-sm border rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-sky-500"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditSave(item.id)}
                    disabled={isPending || !editingText.trim()}
                    className="px-3 py-1 text-xs bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50 transition"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 text-xs border rounded hover:bg-slate-50 transition"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-800 leading-relaxed">{item.description}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {item.status === FeatureQueueStatus.PUBLISHED && item.publishedAt
                  ? `公開: ${new Date(item.publishedAt).toLocaleDateString("ja-JP")}`
                  : `登録: ${new Date(item.createdAt).toLocaleDateString("ja-JP")}`}
              </span>
              {editingId !== item.id && (
                <div className="flex items-center gap-1">
                  {item.status === FeatureQueueStatus.PENDING && (
                    <>
                      <button
                        onClick={() => handleReorder(item.id, "up")}
                        disabled={isPending || index === 0}
                        className="px-1.5 py-0.5 text-xs border rounded hover:bg-slate-50 disabled:opacity-30 transition"
                        title="上へ"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleReorder(item.id, "down")}
                        disabled={isPending || index === filteredItems.length - 1}
                        className="px-1.5 py-0.5 text-xs border rounded hover:bg-slate-50 disabled:opacity-30 transition"
                        title="下へ"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        className="px-2 py-0.5 text-xs border rounded hover:bg-slate-50 transition"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={isPending}
                        className="px-2 py-0.5 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50 transition"
                      >
                        削除
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 新規追加フォーム（PENDINGタブのみ） */}
      {activeTab === FeatureQueueStatus.PENDING && (
        <div className="border rounded-md p-4 bg-slate-50 space-y-3">
          <p className="text-sm font-medium text-slate-700">新しい機能を追加</p>
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="機能名 — ユーザー向けの説明（1〜2文）"
            className="w-full text-sm border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
            rows={3}
          />
          <button
            onClick={handleAdd}
            disabled={isPending || !newDescription.trim()}
            className="px-4 py-1.5 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50 transition"
          >
            追加
          </button>
        </div>
      )}
    </div>
  );
}
