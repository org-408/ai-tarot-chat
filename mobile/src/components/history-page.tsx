import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ChatMessage, DrawnCard, Reading, TarotCard, Tarotist } from "../../../shared/lib/types";
import { useClient } from "../lib/hooks/use-client";
import { useMaster } from "../lib/hooks/use-master";
import { removeBannerAd, showBannerAd } from "../lib/utils/admob";
import { getCardImagePath } from "../lib/utils/salon";

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function formatRelativeDate(date: Date | string) {
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return "今日";
  if (diff === 1) return "昨日";
  if (diff < 7) return `${diff}日前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

function formatFullDate(date: Date | string) {
  return new Date(date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function avatarLetter(name: string | undefined | null) {
  return (name ?? "タ").charAt(0);
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
        <span className="text-white text-sm font-bold">{avatarLetter(name)}</span>
      )}
    </button>
  );
};

// 占い師プロフィールモーダル
const TarotistProfileModal: React.FC<{
  tarotist: Tarotist;
  onClose: () => void;
}> = ({ tarotist, onClose }) => {
  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4"
        onClick={onClose}
      >
        <motion.div
          key="dialog"
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-52 relative">
            <img
              src={`/tarotists/${tarotist.name}.png`}
              alt={tarotist.title ?? tarotist.name}
              className="w-full h-full object-cover object-top"
            />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="p-5">
            <div
              className="text-2xl font-bold mb-1"
              style={{ fontFamily: "'Brush Script MT', cursive", color: tarotist.accentColor ?? "#7c3aed" }}
            >
              {tarotist.icon} {tarotist.name}
            </div>
            <div className="text-sm text-gray-500 mb-3">{tarotist.title}</div>
            {tarotist.trait && (
              <div className="text-sm font-semibold mb-2" style={{ color: tarotist.accentColor ?? "#7c3aed" }}>
                {tarotist.trait}
              </div>
            )}
            <div className="text-sm text-gray-700 leading-relaxed">{tarotist.bio}</div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

// 年 → 月 の2階層グループ化
function groupByYearMonth(readings: Reading[]) {
  const yearMap = new Map<string, Map<string, Reading[]>>();
  for (const r of readings) {
    const d = new Date(r.createdAt);
    const year = `${d.getFullYear()}年`;
    const month = d.toLocaleDateString("ja-JP", { month: "long" });
    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const monthMap = yearMap.get(year)!;
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(r);
  }
  return Array.from(yearMap.entries()).map(([year, monthMap]) => ({
    year,
    months: Array.from(monthMap.entries()).map(([month, items]) => ({ month, items })),
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

type FilterTab = "all" | "normal" | "personal";

// ──────────────────────────────────────────
// 詳細ダイアログ（ProfileDialog と同じ中央ポップアップ）
// ──────────────────────────────────────────

const ReadingDetail: React.FC<{
  reading: Reading;
  cardMap: Map<string, TarotCard>;
  onClose: () => void;
  onTarotistClick?: (tarotist: Tarotist) => void;
}> = ({ reading, cardMap, onClose, onTarotistClick }) => {
  const isPersonal = !!reading.customQuestion;
  const tarotistName = reading.tarotist?.name ?? "タロティスト";
  const cards: DrawnCard[] = reading.cards ?? [];
  const messages: ChatMessage[] = reading.chatMessages ?? [];
  const lastMessage = [...messages].reverse().find((m) => m.role === "TAROTIST");
  const [selectedCard, setSelectedCard] = useState<DrawnCard | null>(null);

  return createPortal(
    <AnimatePresence>
      {/* 背景 overlay */}
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        {/* ダイアログ本体 */}
        <motion.div
          key="dialog"
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col"
          style={{ maxHeight: "85vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
            <TarotistAvatar
              name={tarotistName}
              tarotistId={reading.tarotistId}
              className="w-10 h-10"
              onClick={(e) => {
                e.stopPropagation();
                if (reading.tarotist) onTarotistClick?.(reading.tarotist);
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{tarotistName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatFullDate(reading.createdAt)}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* スクロールエリア */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
            {/* バッジ */}
            <div className="flex flex-wrap gap-2">
              {reading.spread?.name && (
                <span className="text-xs font-medium text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                  {reading.spread.name}
                </span>
              )}
              {isPersonal ? (
                <span className="text-xs font-medium text-fuchsia-700 bg-fuchsia-100 px-3 py-1 rounded-full">
                  パーソナル
                </span>
              ) : reading.category?.name ? (
                <span className="text-xs font-medium text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full">
                  {reading.category.name}
                </span>
              ) : null}
            </div>

            {/* 質問 */}
            {(reading.customQuestion || reading.category?.description) && (
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider mb-1">
                  ご質問
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {reading.customQuestion ?? reading.category?.description}
                </p>
              </div>
            )}

            {/* カード一覧 */}
            {cards.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider mb-2">
                  引いたカード
                </p>
                <div className="space-y-2">
                  {[...cards].sort((a, b) => a.order - b.order).map((dc, i) => {
                    const tarotCard = dc.card ?? cardMap.get(dc.cardId);
                    return (
                      <button
                        key={dc.id ?? i}
                        type="button"
                        onClick={() => setSelectedCard(dc)}
                        className="w-full flex items-start gap-3 bg-gray-50 rounded-xl p-3 active:bg-purple-50/50 transition-colors text-left"
                      >
                        <div
                          className="flex-shrink-0 rounded overflow-hidden border border-purple-200/60 shadow-sm"
                          style={{ width: 32, height: 56 }}
                        >
                          {tarotCard ? (
                            <img
                              src={getCardImagePath(tarotCard)}
                              alt={tarotCard.name}
                              className={`w-full h-full object-cover ${dc.isReversed ? "rotate-180" : ""}`}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-purple-300 to-purple-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {tarotCard && (
                              <span className="text-xs font-bold text-gray-800">{tarotCard.name}</span>
                            )}
                            {dc.isReversed && (
                              <span className="text-[10px] text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                                逆位置
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">{dc.position}</p>
                          {dc.keywords?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {dc.keywords.slice(0, 4).map((kw, ki) => (
                                <span
                                  key={ki}
                                  className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 占い結果 */}
            {lastMessage && (
              <div>
                <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider mb-2">
                  占い結果
                </p>
                <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-sm">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {lastMessage.message}
                  </p>
                </div>
              </div>
            )}

            {/* 会話履歴（パーソナルのみ） */}
            {isPersonal && messages.length > 1 && (
              <details className="group">
                <summary className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-400 uppercase tracking-wider cursor-pointer list-none select-none">
                  会話の全記録
                  <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-2 space-y-2">
                  {messages.map((msg, i) => (
                    <div
                      key={msg.id ?? i}
                      className={`flex ${msg.role === "TAROTIST" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          msg.role === "TAROTIST"
                            ? "bg-gray-50 border border-gray-100 text-gray-700"
                            : "bg-purple-100 text-gray-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div className="h-2" />
          </div>
        </motion.div>
      </motion.div>

      {/* カード詳細ダイアログ（upper-viewer と同じパターン） */}
      <AnimatePresence>
        {selectedCard && (() => {
          const tarotCard = selectedCard.card ?? cardMap.get(selectedCard.cardId);
          return (
            <motion.div
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCard(null)}
            >
              <motion.div
                className="bg-white rounded-2xl p-6 max-w-sm w-full relative shadow-2xl"
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedCard(null)}
                  className="absolute top-3 right-3 p-1.5 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                >
                  <X size={18} />
                </button>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-purple-600 text-white text-sm font-bold rounded-full flex items-center justify-center">
                    {selectedCard.order + 1}
                  </div>
                  <h3 className="text-base font-bold text-purple-900">
                    位置の意味: {selectedCard.position}
                  </h3>
                </div>
                {selectedCard.description && (
                  <div className="text-xs text-gray-600 mb-3 pb-3 border-b border-gray-200">
                    {selectedCard.description}
                  </div>
                )}
                {tarotCard && (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className="rounded-xl border-4 border-purple-400 shadow-2xl overflow-hidden w-24 h-40">
                        <img
                          src={getCardImagePath(tarotCard)}
                          alt={tarotCard.name}
                          className={`w-full h-full object-cover ${selectedCard.isReversed ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      カード: <span className="font-semibold">{tarotCard.name}</span>
                      {selectedCard.isReversed && (
                        <span className="text-red-600 ml-2">(逆位置)</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      キーワード:{" "}
                      {selectedCard.isReversed
                        ? tarotCard.reversedKeywords.join("、")
                        : tarotCard.uprightKeywords.join("、")}
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </AnimatePresence>,
    document.body
  );
};

// ──────────────────────────────────────────
// HistoryPage
// ──────────────────────────────────────────

const TAKE = 20;

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "normal", label: "通常占い" },
  { id: "personal", label: "パーソナル" },
];

const HistoryPage: React.FC = () => {
  const { readings, fetchReadings, error } = useClient();
  const { decks } = useMaster();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTarotistProfile, setSelectedTarotistProfile] = useState<Tarotist | null>(null);
  const [tab, setTab] = useState<FilterTab>("all");
  const [openYears, setOpenYears] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const initialLoadDone = useRef(false);

  const cardMap = new Map<string, TarotCard>(
    (decks[0]?.cards ?? []).map((c) => [c.id, c])
  );

  const all = dedup(readings);

  const filtered = tab === "all"
    ? all
    : tab === "personal"
    ? all.filter((r) => !!r.customQuestion)
    : all.filter((r) => !r.customQuestion);

  const selectedReading = selectedId
    ? (all.find((r) => r.id === selectedId) ?? null)
    : null;

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    setIsLoading(true);
    fetchReadings({ take: TAKE, skip: 0 }).finally(() => setIsLoading(false));
  }, [fetchReadings]);

  const loadMore = async () => {
    if (isLoading || !hasMore) return;
    const before = all.length;
    setIsLoading(true);
    await fetchReadings({ next: true });
    setIsLoading(false);
    if (all.length - before < TAKE) setHasMore(false);
  };

  const grouped = groupByYearMonth(filtered);

  // 初回ロード完了後、最新年を自動で開く
  useEffect(() => {
    if (grouped.length > 0 && openYears.size === 0) {
      setOpenYears(new Set([grouped[0].year]));
    }
  }, [grouped.length]);

  // バナー広告：画面表示中に表示、離脱時に削除
  useEffect(() => {
    showBannerAd();
    return () => {
      removeBannerAd();
    };
  }, []);

  const toggleYear = (year: string) => {
    setOpenYears((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  };

  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-gradient-to-b from-purple-50/50 to-white pb-[60px]">
      {/* ページヘッダー */}
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-xl font-bold text-gray-800">占い履歴</h1>
        {all.length > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">{filtered.length}件</p>
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
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
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
              ? "履歴機能はご利用のプランでは使用できません"
              : "履歴の取得に失敗しました"}
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
            <span className="text-2xl">🔮</span>
          </div>
          <p className="text-gray-500 text-sm text-center">
            {tab === "all"
              ? "まだ占い履歴がありません"
              : tab === "personal"
              ? "パーソナル占いの履歴がありません"
              : "通常占いの履歴がありません"}
          </p>
        </div>
      )}

      {/* 年アコーディオン */}
      <div className="px-4 pb-6 space-y-3">
        {grouped.map(({ year, months, total }) => {
          const isOpen = openYears.has(year);
          return (
            <div key={year} className="rounded-2xl overflow-hidden border border-purple-100/60 bg-white shadow-sm">
              {/* 年ヘッダー（タップで開閉） */}
              <button
                type="button"
                onClick={() => toggleYear(year)}
                className="w-full flex items-center justify-between px-4 py-3.5 active:bg-purple-50/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-gray-800">{year}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
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
                          <p className="text-[11px] font-semibold text-purple-400 tracking-widest mb-2 px-1">
                            {month}
                          </p>
                          <div className="space-y-2">
                            {items.map((r) => {
                              const name = r.tarotist?.name ?? "タロティスト";
                              const isPersonal = !!r.customQuestion;
                              const cards: DrawnCard[] = r.cards ?? [];
                              const subtitle = isPersonal
                                ? r.customQuestion
                                : r.category?.name ?? r.spread?.name;

                              return (
                                <motion.button
                                  key={r.id}
                                  type="button"
                                  onClick={() => setSelectedId(r.id)}
                                  whileTap={{ scale: 0.98 }}
                                  className="w-full text-left bg-gray-50/80 rounded-xl p-3 active:bg-purple-50/50 transition-colors"
                                >
                                  <div className="flex items-start gap-3">
                                    <TarotistAvatar
                                      name={name}
                                      tarotistId={r.tarotistId}
                                      className="w-9 h-9"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (r.tarotist) setSelectedTarotistProfile(r.tarotist);
                                      }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-gray-800 truncate">
                                          {name}
                                        </span>
                                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                          {formatRelativeDate(r.createdAt)}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {r.spread?.name && (
                                          <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                                            {r.spread.name}
                                          </span>
                                        )}
                                        {isPersonal && (
                                          <span className="text-xs font-medium text-fuchsia-700 bg-fuchsia-50 px-2 py-0.5 rounded-full border border-fuchsia-100">
                                            パーソナル
                                          </span>
                                        )}
                                      </div>
                                      {subtitle && (
                                        <p className="text-xs text-gray-500 line-clamp-1 mt-1">{subtitle}</p>
                                      )}
                                      {cards.length > 0 && (
                                        <div className="flex gap-1 mt-1.5 items-end">
                                          {cards.slice(0, 5).map((dc, ci) => {
                                            const tc = dc.card ?? cardMap.get(dc.cardId);
                                            return (
                                              <div
                                                key={dc.id ?? ci}
                                                className="rounded overflow-hidden border border-purple-200/60 shadow-sm flex-shrink-0"
                                                style={{ width: 18, height: 31 }}
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
                                            <span className="text-[10px] text-gray-400 ml-0.5">
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
            className="flex items-center gap-2 text-sm text-purple-600 bg-white px-5 py-2.5 rounded-full border border-purple-200 shadow-sm"
          >
            <ChevronDown className="w-4 h-4" />
            もっと見る
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

      {/* 詳細ダイアログ */}
      {selectedReading && (
        <ReadingDetail
          reading={selectedReading}
          cardMap={cardMap}
          onClose={() => setSelectedId(null)}
          onTarotistClick={setSelectedTarotistProfile}
        />
      )}
      {selectedTarotistProfile && (
        <TarotistProfileModal
          tarotist={selectedTarotistProfile}
          onClose={() => setSelectedTarotistProfile(null)}
        />
      )}
    </div>
  );
};

export default HistoryPage;
