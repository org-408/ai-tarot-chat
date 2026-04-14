"use client";

import type { Reading } from "@shared/lib/types";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type FilterTab = "all" | "quick" | "personal";

function formatDate(
  date: Date | string,
  t: ReturnType<typeof useTranslations>
): string {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t("today");
  if (diffDays === 1) return t("yesterday");
  return t("daysAgo", { count: diffDays });
}

function groupByYearMonth(readings: Reading[]) {
  const groups = new Map<string, Map<string, Reading[]>>();
  for (const r of readings) {
    const d = new Date(r.createdAt);
    const year = d.getFullYear().toString();
    const month = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(year)) groups.set(year, new Map());
    const yearGroup = groups.get(year)!;
    if (!yearGroup.has(month)) yearGroup.set(month, []);
    yearGroup.get(month)!.push(r);
  }
  return groups;
}

function ReadingCard({ reading }: { reading: Reading }) {
  const drawnCards = reading.cards ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* タロティストアバター */}
        <div
          className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden"
          style={{ background: reading.tarotist?.primaryColor ?? "#7c3aed" }}
        >
          {reading.tarotist?.name ? (
            <img
              src={`/tarotists/${reading.tarotist.name}.png`}
              alt={reading.tarotist.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-white text-sm">
              {reading.tarotist?.icon ?? "🔮"}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">
              {reading.tarotist?.name ?? "Unknown"}
            </span>
            {reading.category == null && (
              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                パーソナル
              </span>
            )}
            {reading.spread?.name && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {reading.spread.name}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(reading.createdAt).toLocaleString("ja-JP", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {/* カードサムネイル */}
          {drawnCards.length > 0 && (
            <div className="flex gap-1 mt-2">
              {(drawnCards as import("@shared/lib/types").DrawnCard[]).slice(0, 5).map((dc, i) => (
                <div
                  key={i}
                  className="w-8 h-12 rounded overflow-hidden border border-gray-100 bg-gray-50"
                >
                  <img
                    src={`/cards/${dc.card?.code ?? "back"}.png`}
                    alt=""
                    className={`w-full h-full object-cover ${dc.isReversed ? "rotate-180" : ""}`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                </div>
              ))}
              {drawnCards.length > 5 && (
                <div className="w-8 h-12 rounded border border-gray-100 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                  +{drawnCards.length - 5}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function HistoryPage() {
  const t = useTranslations("history");
  const { readings, readingsTotal, isLoadingReadings, fetchReadings } =
    useClientStore();
  const [tab, setTab] = useState<FilterTab>("all");
  const [openYears, setOpenYears] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  const filtered = readings.filter((r) => {
    if (tab === "quick") return r.category != null;
    if (tab === "personal") return r.category == null;
    return true;
  });

  const grouped = groupByYearMonth(filtered);
  const years = Array.from(grouped.keys()).sort((a, b) => Number(b) - Number(a));

  if (years.length > 0 && openYears.size === 0) {
    setOpenYears(new Set([years[0]]));
  }

  const toggleYear = (year: string) => {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const hasMore = readings.length < readingsTotal;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("title")}</h1>

      {/* フィルタータブ */}
      <div className="flex gap-2 mb-6">
        {(["all", "quick", "personal"] as FilterTab[]).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              tab === tabKey
                ? "bg-purple-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t(tabKey)}
          </button>
        ))}
      </div>

      {/* 履歴リスト */}
      {filtered.length === 0 && !isLoadingReadings ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔮</p>
          <p>{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {years.map((year) => {
            const isOpen = openYears.has(year);
            const monthGroups = grouped.get(year)!;
            return (
              <div key={year}>
                <button
                  onClick={() => toggleYear(year)}
                  className="flex items-center gap-2 w-full text-left py-2"
                >
                  <span className="font-bold text-gray-700">{year}年</span>
                  <span className="text-gray-400 text-sm">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {Array.from(monthGroups.entries())
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([month, monthReadings]) => (
                          <div key={month} className="mb-4 pl-4">
                            <p className="text-sm font-medium text-gray-500 mb-2">
                              {month}
                            </p>
                            <div className="space-y-2">
                              {monthReadings.map((r) => (
                                <ReadingCard key={r.id} reading={r} />
                              ))}
                            </div>
                          </div>
                        ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* もっと見る */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => fetchReadings({ next: true })}
            disabled={isLoadingReadings}
            className="px-6 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoadingReadings ? "読み込み中..." : t("loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}
