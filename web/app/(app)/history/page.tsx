"use client";

import type { Reading, TarotCard, Tarotist } from "@shared/lib/types";
import { TarotistInfoDialog } from "@shared/components/tarotist/tarotist-info-dialog";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import {
  buildTarotCardMap,
  hydrateDrawnCards,
} from "@/lib/client/utils/drawn-card";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

type FilterTab = "all" | "quick" | "personal";

// ── ヘルパー ──────────────────────────────────────────────

function formatRelativeDate(date: Date | string): string {
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return "今日";
  if (diff === 1) return "昨日";
  if (diff < 7) return `${diff}日前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

type YearGroup = {
  year: string;
  yearKey: string; // sort key (number string)
  months: { month: string; monthKey: string; items: Reading[] }[];
  total: number;
};

function groupByYearMonth(readings: Reading[]): YearGroup[] {
  const yearMap = new Map<string, Map<string, Reading[]>>();
  for (const r of readings) {
    const d = new Date(r.createdAt);
    const yearKey = d.getFullYear().toString();
    const monthKey = `${yearKey}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!yearMap.has(yearKey)) yearMap.set(yearKey, new Map());
    const monthMap = yearMap.get(yearKey)!;
    if (!monthMap.has(monthKey)) monthMap.set(monthKey, []);
    monthMap.get(monthKey)!.push(r);
  }
  return Array.from(yearMap.entries())
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([yearKey, monthMap]) => ({
      year: `${yearKey}年`,
      yearKey,
      months: Array.from(monthMap.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([monthKey, items]) => ({
          month: `${Number(monthKey.split("/")[1])}月`,
          monthKey,
          items,
        })),
      total: Array.from(monthMap.values()).reduce((s, a) => s + a.length, 0),
    }));
}

// ── ReadingCard ────────────────────────────────────────────

function ReadingCard({
  reading,
  cardMap,
  onTarotistClick,
}: {
  reading: Reading;
  cardMap: Map<string, TarotCard>;
  onTarotistClick: (tarotist: Tarotist) => void;
}) {
  const drawnCards = hydrateDrawnCards(reading.cards, cardMap);
  const isPersonal = !!reading.customQuestion;
  const subtitle = isPersonal ? reading.customQuestion : reading.category?.name;

  return (
    <Link href={`/history/${reading.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-start gap-3">
          {/* タロティストアバター */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (reading.tarotist) onTarotistClick(reading.tarotist);
            }}
            className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-purple-400 transition-all"
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
                {reading.tarotist?.icon ?? "✦"}
              </span>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-base text-gray-900 truncate">
                {reading.tarotist?.name ?? "Unknown"}
              </span>
              <span className="text-sm text-gray-400 flex-shrink-0">
                {formatRelativeDate(reading.createdAt)}
              </span>
            </div>
            {subtitle && (
              <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                {subtitle}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {reading.spread?.name && (
                <span className="text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                  {reading.spread.name}
                </span>
              )}
              {isPersonal && (
                <span className="text-sm bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                  パーソナル
                </span>
              )}
            </div>

            {/* カードサムネイル */}
            {drawnCards.length > 0 && (
              <div className="flex gap-1 mt-2">
                {(drawnCards as import("@shared/lib/types").DrawnCard[])
                  .slice(0, 5)
                  .map((dc, i) => (
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
    </Link>
  );
}

// ── HistoryPage ────────────────────────────────────────────

export default function HistoryPage() {
  const t = useTranslations("history");
  const { readings, readingsTotal, isLoadingReadings, fetchReadings } =
    useClientStore();
  const masterData = useMasterStore((state) => state.data);
  const initMaster = useMasterStore((state) => state.init);
  const [tab, setTab] = useState<FilterTab>("all");
  const [openYears, setOpenYears] = useState<Set<string>>(new Set());
  const [selectedTarotist, setSelectedTarotist] = useState<Tarotist | null>(
    null,
  );
  const cardMap = buildTarotCardMap(masterData);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  useEffect(() => {
    void initMaster();
  }, [initMaster]);

  const filtered = readings.filter((r) => {
    if (tab === "quick") return !r.customQuestion;
    if (tab === "personal") return !!r.customQuestion;
    return true;
  });

  const grouped = groupByYearMonth(filtered);

  // 初回ロード後に最新年を自動で開く
  useEffect(() => {
    if (grouped.length > 0 && openYears.size === 0) {
      setOpenYears(new Set([grouped[0].yearKey]));
    }
  // grouped は毎レンダー新規参照のため length をプロキシに使用
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped.length]);

  const toggleYear = (yearKey: string) => {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(yearKey)) next.delete(yearKey);
      else next.add(yearKey);
      return next;
    });
  };

  const hasMore = readings.length < readingsTotal;

  const TABS: { id: FilterTab; label: string }[] = [
    { id: "all", label: t("all") },
    { id: "quick", label: t("quick") },
    { id: "personal", label: t("personal") },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("title")}</h1>

      {/* フィルタータブ */}
      <div className="flex gap-2 mb-6">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              tab === id
                ? "bg-purple-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 履歴リスト */}
      {filtered.length === 0 && !isLoadingReadings ? (
        <div className="text-center py-16 text-gray-400">
          <div className="w-16 h-24 mx-auto mb-3 rounded overflow-hidden border border-gray-200 bg-gray-100" />
          <p className="text-base">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ year, yearKey, months, total }) => {
            const isOpen = openYears.has(yearKey);
            return (
              <div
                key={yearKey}
                className="rounded-2xl overflow-hidden border border-purple-100/60 bg-white shadow-sm"
              >
                {/* 年ヘッダー */}
                <button
                  onClick={() => toggleYear(yearKey)}
                  className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-purple-50/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-800">
                      {year}
                    </span>
                    <span className="text-sm text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {total}件
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-purple-50 px-3 pb-3 pt-2 space-y-4">
                        {months.map(({ month, monthKey, items }) => (
                          <div key={monthKey}>
                            <p className="text-sm font-semibold text-purple-400 tracking-widest mb-2 px-1">
                              {month}
                            </p>
                            <div className="space-y-2">
                              {items.map((r) => (
                                <ReadingCard
                                  key={r.id}
                                  reading={r}
                                  cardMap={cardMap}
                                  onTarotistClick={setSelectedTarotist}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
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
            className="px-6 py-2 bg-white border border-gray-200 rounded-full text-base text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoadingReadings ? t("loadMore") + "..." : t("loadMore")}
          </button>
        </div>
      )}

      {/* タロティストプロフィールダイアログ */}
      <AnimatePresence>
        {selectedTarotist && (
          <TarotistInfoDialog
            tarotist={selectedTarotist}
            onClose={() => setSelectedTarotist(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
