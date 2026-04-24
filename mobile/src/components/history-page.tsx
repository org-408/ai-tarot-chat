import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  DrawnCard,
  Reading,
  TarotCard,
  Tarotist,
} from "../../../shared/lib/types";
import { TarotistInfoDialog } from "../../../shared/components/tarotist/tarotist-info-dialog";
import i18n from "../i18n";
import { useClient } from "../lib/hooks/use-client";
import { useMaster } from "../lib/hooks/use-master";
import { removeBannerAd, showBannerAd } from "../lib/utils/admob";
import { getCardImagePath } from "../lib/utils/salon";

const HistoryDetailPage = lazy(() => import("./history-detail-page"));

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function formatRelativeDate(date: Date | string) {
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return i18n.t("history.today");
  if (diff === 1) return i18n.t("history.yesterday");
  if (diff < 7) return i18n.t("history.daysAgo", { count: diff });
  const locale = i18n.language === "ja" ? "ja-JP" : "en-US";
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function avatarLetter(name: string | undefined | null) {
  return (name ?? "T").charAt(0);
}

function avatarColor(id: string | null | undefined): string {
  const colors = [
    "bg-violet-500",
    "bg-indigo-500",
    "bg-fuchsia-500",
    "bg-rose-500",
    "bg-amber-500",
    "bg-teal-500",
  ];
  return colors[(id?.charCodeAt(0) ?? 0) % colors.length];
}

// 占い師アバター（顔画像 → 失敗時はイニシャル）
const TarotistAvatar: React.FC<{
  name: string;
  tarotistId?: string | null;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ name, tarotistId, className = "w-9 h-9", onClick }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${className} rounded-full overflow-hidden flex-shrink-0 shadow-sm ${imgError ? `${avatarColor(tarotistId)} flex items-center justify-center` : ""}`}
    >
      {!imgError ? (
        <img
          src={`/tarotists/${name}.png`}
          alt={name}
          className="w-full h-full object-cover object-top"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-white text-sm font-bold">
          {avatarLetter(name)}
        </span>
      )}
    </button>
  );
};


// 年 → 月 の2階層グループ化
function groupByYearMonth(readings: Reading[]) {
  const yearMap = new Map<string, Map<string, Reading[]>>();
  const locale = i18n.language === "ja" ? "ja-JP" : "en-US";
  for (const r of readings) {
    const d = new Date(r.createdAt);
    const year = i18n.t("history.yearLabel", { year: d.getFullYear() });
    const month = d.toLocaleDateString(locale, { month: "long" });
    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const monthMap = yearMap.get(year)!;
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(r);
  }
  return Array.from(yearMap.entries()).map(([year, monthMap]) => ({
    year,
    months: Array.from(monthMap.entries()).map(([month, items]) => ({
      month,
      items,
    })),
    total: Array.from(monthMap.values()).reduce((s, a) => s + a.length, 0),
  }));
}

function dedup(readings: Reading[]): Reading[] {
  const seen = new Set<string>();
  return readings.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

type FilterTab = "all" | "quick" | "personal";

// ──────────────────────────────────────────
// HistoryPage
// ──────────────────────────────────────────

const TAKE = 20;

interface HistoryPageProps {
  initialReading?: Reading;
  onInitialReadingConsumed?: () => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({
  initialReading,
  onInitialReadingConsumed,
}) => {
  const { t } = useTranslation();
  const TABS: { id: FilterTab; label: string }[] = [
    { id: "all", label: t("history.tabAll") },
    { id: "quick", label: t("history.tabQuick") },
    { id: "personal", label: t("history.tabPersonal") },
  ];
  const { readings, readingsTotal, fetchReadings, error, currentPlan } =
    useClient();
  const { decks } = useMaster();
  const [selectedReading, setSelectedReading] = useState<Reading | null>(
    initialReading ?? null,
  );
  const [selectedTarotistProfile, setSelectedTarotistProfile] =
    useState<Tarotist | null>(null);
  const [tab, setTab] = useState<FilterTab>("all");
  const [openYears, setOpenYears] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const initialLoadDone = useRef(false);

  const cardMap = new Map<string, TarotCard>(
    (decks[0]?.cards ?? []).map((c) => [c.id, c]),
  );

  const all = dedup(readings);
  const hasMore = all.length < readingsTotal;

  const filtered =
    tab === "all"
      ? all
      : tab === "personal"
        ? all.filter((r) => !!r.customQuestion)
        : all.filter((r) => !r.customQuestion);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    setIsLoading(true);
    fetchReadings({ take: TAKE, skip: 0 }).finally(() => setIsLoading(false));
  }, [fetchReadings]);

  useEffect(() => {
    if (!initialReading) return;
    setSelectedReading(initialReading);
    onInitialReadingConsumed?.();
  }, [initialReading, onInitialReadingConsumed]);

  const loadMore = async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    await fetchReadings({ next: true });
    setIsLoading(false);
  };

  const grouped = groupByYearMonth(filtered);

  // 初回ロード完了後、最新年を自動で開く
  useEffect(() => {
    if (grouped.length > 0 && openYears.size === 0) {
      setOpenYears(new Set([grouped[0].year]));
    }
  // grouped は毎レンダー新規参照のため length をプロキシに使用（初回ロード時のみ開く）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped.length]);

  // バナー広告：GUEST/FREE プランのみ表示
  const showAds =
    !currentPlan || currentPlan.code === "GUEST" || currentPlan.code === "FREE";
  useEffect(() => {
    if (!showAds) return;
    showBannerAd();
    return () => {
      removeBannerAd();
    };
  }, [showAds]);

  const toggleYear = (year: string) => {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-gradient-to-b from-purple-50/50 to-white pb-[60px]">
      {/* ページヘッダー */}
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-xl font-bold text-gray-800">
          {t("history.pageTitle")}
        </h1>
        {all.length > 0 && (
          <p className="text-sm text-gray-400 mt-0.5">
            {t("history.itemCount", { count: filtered.length })}
          </p>
        )}
      </div>

      {/* フィルタータブ */}
      <div className="px-4 pb-3">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                tab === t.id
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* エラー */}
      {error && !isLoading && all.length === 0 && (
        <div className="mx-4 mt-2 bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
          <p className="text-sm text-red-600">
            {error.message.includes("hasHistory")
              ? t("history.errorPlanRestricted")
              : t("history.errorFetchFailed")}
          </p>
        </div>
      )}

      {/* ローディング skeleton */}
      {isLoading && all.length === 0 && (
        <div className="px-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white/60 rounded-2xl h-24 animate-pulse border border-purple-50"
            />
          ))}
        </div>
      )}

      {/* 空状態 */}
      {!isLoading && filtered.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center mt-12 gap-4 px-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
            <span className="text-2xl">✨</span>
          </div>
          <p className="text-gray-500 text-base text-center">
            {tab === "all"
              ? t("history.emptyAll")
              : tab === "personal"
                ? t("history.emptyPersonal")
                : t("history.emptyQuick")}
          </p>
        </div>
      )}

      {/* 年アコーディオン */}
      <div className="px-4 pb-6 space-y-3">
        {grouped.map(({ year, months, total }) => {
          const isOpen = openYears.has(year);
          return (
            <div
              key={year}
              className="rounded-2xl overflow-hidden border border-purple-100/60 bg-white shadow-sm"
            >
              {/* 年ヘッダー（タップで開閉） */}
              <button
                type="button"
                onClick={() => toggleYear(year)}
                className="w-full flex items-center justify-between px-4 py-3.5 active:bg-purple-50/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-800">
                    {year}
                  </span>
                  <span className="text-sm text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {t("history.itemCount", { count: total })}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </motion.div>
              </button>

              {/* 月ごとのコンテンツ */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-purple-50 px-3 pb-3 pt-2 space-y-4">
                      {months.map(({ month, items }) => (
                        <div key={month}>
                          <p className="text-xs font-semibold text-purple-400 tracking-widest mb-2 px-1">
                            {month}
                          </p>
                          <div className="space-y-2">
                            {items.map((r) => {
                              const name =
                                r.tarotist?.name ?? t("history.unknownTarotist");
                              const isPersonal = !!r.customQuestion;
                              const cards: DrawnCard[] = r.cards ?? [];
                              const subtitle = isPersonal
                                ? r.customQuestion
                                : r.category?.name;

                              return (
                                <motion.button
                                  key={r.id}
                                  type="button"
                                  onClick={() => setSelectedReading(r)}
                                  whileTap={{ scale: 0.98 }}
                                  className="w-full text-left bg-gray-50/80 rounded-xl p-3 active:bg-purple-50/50 transition-colors"
                                >
                                  <div className="flex items-start gap-3">
                                    <TarotistAvatar
                                      name={name}
                                      tarotistId={r.tarotistId}
                                      className="w-10 h-10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (r.tarotist)
                                          setSelectedTarotistProfile(
                                            r.tarotist,
                                          );
                                      }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-base font-semibold text-gray-800 truncate">
                                          {name}
                                        </span>
                                        <span className="text-sm text-gray-400 flex-shrink-0 ml-2">
                                          {formatRelativeDate(r.createdAt)}
                                        </span>
                                      </div>
                                      {subtitle && (
                                        <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                                          {subtitle}
                                        </p>
                                      )}
                                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                        {r.spread?.name && (
                                          <span className="text-sm font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                                            {r.spread.name}
                                          </span>
                                        )}
                                        {isPersonal && (
                                          <span className="text-sm font-medium text-fuchsia-700 bg-fuchsia-50 px-2 py-0.5 rounded-full border border-fuchsia-100">
                                            {t("history.personalTag")}
                                          </span>
                                        )}
                                      </div>
                                      {cards.length > 0 && (
                                        <div className="flex gap-1 mt-1.5 items-end">
                                          {cards.slice(0, 5).map((dc, ci) => {
                                            const tc =
                                              dc.card ?? cardMap.get(dc.cardId);
                                            return (
                                              <div
                                                key={dc.id ?? ci}
                                                className="rounded overflow-hidden border border-purple-200/60 shadow-sm flex-shrink-0"
                                                style={{
                                                  width: 18,
                                                  height: 31,
                                                }}
                                              >
                                                {tc ? (
                                                  <img
                                                    src={getCardImagePath(tc)}
                                                    alt={tc.name}
                                                    className={`w-full h-full object-cover ${dc.isReversed ? "rotate-180" : ""}`}
                                                  />
                                                ) : (
                                                  <div className="w-full h-full bg-gradient-to-b from-purple-300 to-purple-500" />
                                                )}
                                              </div>
                                            );
                                          })}
                                          {cards.length > 5 && (
                                            <span className="text-xs text-gray-400 ml-0.5">
                                              +{cards.length - 5}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.button>
                              );
                            })}
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

      {/* もっと見る */}
      {hasMore && all.length >= TAKE && !isLoading && (
        <div className="flex justify-center pb-8">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={loadMore}
            className="flex items-center gap-2 text-base text-purple-600 bg-white px-5 py-2.5 rounded-full border border-purple-200 shadow-sm"
          >
            <ChevronDown className="w-4 h-4" />
            {t("history.loadMore")}
          </motion.button>
        </div>
      )}

      {/* ローディング（追加分） */}
      {isLoading && all.length > 0 && (
        <div className="flex justify-center pb-8 gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      {selectedTarotistProfile && (
        <TarotistInfoDialog
          tarotist={selectedTarotistProfile}
          onClose={() => setSelectedTarotistProfile(null)}
        />
      )}

      {/* 履歴詳細（フルスクリーンオーバーレイ） */}
      <AnimatePresence>
        {selectedReading && (
          <motion.div
            key="history-detail"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-40 bg-white"
          >
            <Suspense fallback={null}>
              <HistoryDetailPage
                reading={selectedReading}
                cardMap={cardMap}
                onClose={() => setSelectedReading(null)}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HistoryPage;
