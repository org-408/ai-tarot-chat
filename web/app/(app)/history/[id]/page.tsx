"use client";

import { useClientStore } from "@/lib/client/stores/client-store";
import { MessageContent } from "@shared/components/chat/message-content";
import type { DrawnCard } from "@shared/lib/types";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";

function formatReadingDate(date: string | Date): string {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}/${mo}/${day} ${h}:${mi}:${s}`;
}

export default function HistoryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const t = useTranslations("history");
  const { readings, isLoadingReadings, fetchReadings } = useClientStore();

  useEffect(() => {
    if (readings.length === 0 && !isLoadingReadings) {
      fetchReadings();
    }
  }, [readings.length, isLoadingReadings, fetchReadings]);

  const reading = readings.find((r) => r.id === id);

  if (!reading && isLoadingReadings) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>{t("loadMore")}</p>
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-muted-foreground mb-4">{t("notFound")}</p>
        <button
          onClick={() => router.push("/history")}
          className="text-sm text-primary hover:underline"
        >
          {t("backToHistory")}
        </button>
      </div>
    );
  }

  const messages = reading.chatMessages ?? [];
  const drawnCards = (reading.cards ?? []) as DrawnCard[];

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ height: "calc(100dvh - 120px)" }}>
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <button
          onClick={() => router.push("/history")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
        <div
          className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
          style={{ background: reading.tarotist?.primaryColor ?? "#7c3aed" }}
        >
          {reading.tarotist?.name && (
            <img
              src={`/tarotists/${reading.tarotist.name}.png`}
              alt={reading.tarotist.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-semibold text-foreground text-sm truncate">
            {reading.tarotist?.name ?? "Unknown"}
          </span>
          {reading.category == null && (
            <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full flex-shrink-0">
              {t("personalBadge")}
            </span>
          )}
          {reading.spread?.name && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex-shrink-0">
              {reading.spread.name}
            </span>
          )}
        </div>
      </div>

      {/* 引いたカード */}
      {drawnCards.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 flex-shrink-0">
          {drawnCards.map((dc, i) => (
            <div
              key={i}
              className="w-10 rounded overflow-hidden border border-border bg-muted flex-shrink-0"
              style={{ height: "3.75rem" }}
            >
              <img
                src={`/cards/${dc.card?.code ?? "back"}.png`}
                alt=""
                className={`w-full h-full object-cover ${dc.isReversed ? "rotate-180" : ""}`}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* チャットエリア */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white rounded-2xl border border-border">
        <div className="px-4 py-5 space-y-5">
          {/* 日時スタンプ */}
          <div className="flex justify-center">
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {formatReadingDate(reading.createdAt)}
            </span>
          </div>

          {/* 占い情報バッジ */}
          {(reading.category || reading.spread || reading.customQuestion) && (
            <div className="space-y-2">
              {reading.customQuestion ? (
                <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2.5">
                  <p className="text-xs text-purple-500 font-medium mb-1">
                    {t("questionLabel")}
                  </p>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {reading.customQuestion}
                  </p>
                </div>
              ) : (
                <>
                  {reading.category && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-medium">
                        {t("categoryLabel")}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        {reading.category.name}
                      </span>
                    </div>
                  )}
                  {reading.spread && (
                    <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs text-purple-500 font-medium">
                          🃏 {t("spreadLabel")}
                        </span>
                        <span className="text-xs font-bold text-purple-800">
                          {reading.spread.name}
                        </span>
                      </div>
                      {reading.spread.guide && (
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {reading.spread.guide}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* メッセージ一覧 */}
          {messages.map((msg, i) => (
            <div
              key={msg.id ?? i}
              className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "USER" ? (
                <div className="bg-gray-100 rounded-3xl px-4 py-3 inline-block max-w-[85%]">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {msg.message}
                  </p>
                </div>
              ) : (
                <div className="max-w-[92%]">
                  <MessageContent content={msg.message} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
