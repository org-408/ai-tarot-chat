"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { ReadingRow } from "@/app/(admin)/admin/(protected)/readings/readings-page-client";

const PLAN_COLOR: Record<string, string> = {
  GUEST: "bg-gray-100 text-gray-600",
  FREE: "bg-green-100 text-green-700",
  STANDARD: "bg-blue-100 text-blue-700",
  PREMIUM: "bg-purple-100 text-purple-700",
};

export function ReadingDetailModal({
  reading,
  onClose,
}: {
  reading: ReadingRow;
  onClose: () => void;
}) {
  const [showAllChat, setShowAllChat] = useState(false);

  const visibleMessages = showAllChat
    ? reading.chatMessages
    : reading.chatMessages.slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-base">占い詳細</h2>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* 基本情報 */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              基本情報
            </h3>
            <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex gap-4 flex-wrap">
                <span className="text-slate-500">日時:</span>
                <span>
                  {new Date(reading.createdAt).toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {reading.category && (
                  <>
                    <span className="text-slate-500">カテゴリ:</span>
                    <span>{reading.category.name}</span>
                  </>
                )}
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-slate-500">クライアント:</span>
                <span>{reading.client.name ?? "(名前なし)"}</span>
                {reading.client.email && (
                  <span className="text-slate-400 text-xs">{reading.client.email}</span>
                )}
                {reading.client.isRegistered ? (
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${PLAN_COLOR[reading.client.plan.code] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {reading.client.plan.name}
                  </span>
                ) : (
                  <Badge variant="outline" className="text-xs text-slate-400 h-5">
                    ゲスト
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-slate-500">タロティスト:</span>
                <span>
                  {reading.tarotist.icon} {reading.tarotist.name}
                </span>
                {reading.tarotist.model && (
                  <span className="text-slate-400 text-xs">({reading.tarotist.model})</span>
                )}
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-slate-500">スプレッド:</span>
                <span>
                  {reading.spread.name}
                  <span className="text-slate-400 text-xs ml-1">
                    ({reading.spread.cellCount}枚)
                  </span>
                </span>
              </div>
              {reading.customQuestion && (
                <div className="flex gap-2 flex-wrap">
                  <span className="text-slate-500 flex-none">質問:</span>
                  <span className="text-slate-800">「{reading.customQuestion}」</span>
                </div>
              )}
            </div>
          </section>

          {/* 引いたカード */}
          {reading.cards.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                引いたカード ({reading.cards.length}枚)
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {reading.cards.map((c) => (
                  <div
                    key={c.id}
                    className="border rounded-lg p-2 text-center text-xs space-y-0.5 bg-white"
                  >
                    <div className="text-lg">🃏</div>
                    <div className="font-medium truncate" title={c.cardName}>
                      {c.cardName}
                    </div>
                    {c.isReversed && (
                      <span className="inline-block bg-red-100 text-red-600 px-1 rounded text-[10px]">
                        逆
                      </span>
                    )}
                    <div className="text-slate-400 truncate" title={c.position}>
                      {c.position}
                    </div>
                    {c.keywords.length > 0 && (
                      <div className="text-slate-400 text-[10px] truncate">
                        {c.keywords.slice(0, 2).join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* チャット履歴 */}
          {reading.chatMessages.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                チャット履歴 ({reading.chatMessages.length}件)
              </h3>
              <div className="space-y-2">
                {visibleMessages.map((msg) => {
                  const isTarotist = msg.role === "TAROTIST";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isTarotist ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                          isTarotist
                            ? "bg-slate-100 text-slate-800"
                            : "bg-sky-600 text-white"
                        }`}
                      >
                        {isTarotist && (
                          <span className="font-semibold block mb-0.5">
                            {reading.tarotist.icon} {reading.tarotist.name}
                          </span>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      </div>
                    </div>
                  );
                })}
                {reading.chatMessages.length > 3 && !showAllChat && (
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-500"
                      onClick={() => setShowAllChat(true)}
                    >
                      全て表示 ({reading.chatMessages.length}件)
                    </Button>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
