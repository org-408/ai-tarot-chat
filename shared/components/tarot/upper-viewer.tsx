import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { DrawnCard, Spread } from "../../lib/types";
import { CARD_ASPECT } from "./tarot-card-image";

// ─────────────────────────────────────────────────────────────
// TarotFlipCard — 裏返しアニメーション付きカード
// ─────────────────────────────────────────────────────────────

interface TarotFlipCardProps {
  placement: DrawnCard;
  isFlipped: boolean;
  onFlip: (id: string) => void;
  width: number;
  height: number;
  cardBasePath: string;
}

const TarotFlipCard: React.FC<TarotFlipCardProps> = ({
  placement,
  isFlipped,
  onFlip,
  width,
  height,
  cardBasePath,
}) => {
  const [imgError, setImgError] = useState(false);
  const imgPath = `${cardBasePath}/${placement.card?.code ?? "unknown"}.png`;

  return (
    <motion.div
      className="cursor-pointer select-none"
      style={{ width, height, perspective: 600 }}
      onClick={() => onFlip(placement.id)}
    >
      <motion.div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
        }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* 裏面 */}
        <div
          className="absolute inset-0 rounded-xl border-2 border-purple-400 shadow-md overflow-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="w-full h-full bg-gradient-to-br from-purple-800 to-indigo-900 flex items-center justify-center">
            <span className="text-2xl">🔮</span>
          </div>
        </div>

        {/* 表面 */}
        <div
          className="absolute inset-0 rounded-xl border-2 shadow-md overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {!imgError && placement.card ? (
            <img
              src={imgPath}
              alt={placement.card.name}
              onError={() => setImgError(true)}
              className={`w-full h-full object-cover ${
                placement.isReversed ? "rotate-180" : ""
              } ${placement.isReversed ? "border-red-500" : "border-amber-600"}`}
              style={{ aspectRatio: `${CARD_ASPECT}` }}
            />
          ) : (
            <div className="w-full h-full bg-purple-100 flex flex-col items-center justify-center p-1">
              <span className="text-xl">
                {placement.card?.type === "major" ? "🌟" : "🎴"}
              </span>
              <span className="text-[8px] font-bold text-center leading-tight mt-1">
                {placement.card?.name ?? "?"}
              </span>
              {placement.isReversed && (
                <span className="text-[7px] text-red-600">逆位置</span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// UpperViewer
// ─────────────────────────────────────────────────────────────

type ViewMode = "grid" | "carousel";

interface UpperViewerProps {
  spread: Spread;
  drawnCards: DrawnCard[];
  isRevealingCompleted: boolean;
  onRevealingCompleted?: () => void;
  /** 占い師画像 URL (プロフィールタブ用) */
  tarotistImageUrl?: string;
  /** 占い師名 (alt テキスト) */
  tarotistName?: string;
  /** カード画像の base パス。デフォルト: "/cards" */
  cardBasePath?: string;
}

const DIALOG_CARD_WIDTH = 200;

/**
 * カードめくりエリア。
 * グリッドビュー / カルーセルビューをタブで切替。
 * プラットフォーム非依存 (embla 不使用)。
 */
export const UpperViewer: React.FC<UpperViewerProps> = ({
  drawnCards,
  isRevealingCompleted,
  onRevealingCompleted,
  tarotistImageUrl,
  tarotistName,
  cardBasePath = "/cards",
}) => {
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [selectedCard, setSelectedCard] = useState<DrawnCard | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showHint, setShowHint] = useState(true);

  // 5秒後にヒント消去
  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // isRevealingCompleted が true になったら全カードをめくる
  useEffect(() => {
    if (isRevealingCompleted) {
      setFlippedCards(new Set(drawnCards.map((c) => c.id)));
    }
  }, [isRevealingCompleted, drawnCards]);

  // 全カードめくり完了 → onRevealingCompleted コールバック
  useEffect(() => {
    if (
      flippedCards.size > 0 &&
      flippedCards.size === drawnCards.length &&
      !selectedCard &&
      onRevealingCompleted
    ) {
      const t = setTimeout(() => {
        onRevealingCompleted();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [flippedCards, drawnCards.length, selectedCard, onRevealingCompleted]);

  const handleFlip = useCallback((cardId: string) => {
    setShowHint(false);
    setFlippedCards((prev) => {
      if (prev.has(cardId)) return prev;
      return new Set([...prev, cardId]);
    });
  }, []);

  const currentCard = drawnCards[carouselIndex];

  const gridCols =
    drawnCards.length > 0 ? Math.max(...drawnCards.map((c) => c.x)) + 1 : 3;
  const gridRows =
    drawnCards.length > 0 ? Math.max(...drawnCards.map((c) => c.y)) + 1 : 3;

  const FLIP_W = 56;
  const FLIP_H = 96;

  const tabs: { key: ViewMode | "profile"; label: string }[] = [
    ...(tarotistImageUrl ? [{ key: "profile" as const, label: "占い師" }] : []),
    { key: "grid", label: "スプレッド" },
    { key: "carousel", label: "個別カード" },
  ];
  const [activeTab, setActiveTab] = useState<ViewMode | "profile">("grid");

  return (
    <div className="w-full h-full bg-white flex flex-col pt-1">
      {/* タブ切替 */}
      <div className="w-full flex justify-center gap-3 p-1 bg-white border-b border-purple-100">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 h-7 text-xs rounded-full transition-all ${
              activeTab === tab.key
                ? "bg-purple-400/70 text-white font-semibold"
                : "bg-purple-100/60 text-purple-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* プロフィールタブ */}
        {activeTab === "profile" && tarotistImageUrl && (
          <div className="w-full h-full flex items-center justify-center p-2">
            <img
              src={tarotistImageUrl}
              alt={tarotistName ?? "占い師"}
              className="max-w-full max-h-full object-cover rounded-2xl"
              style={{ objectPosition: "center 20%" }}
            />
          </div>
        )}

        {/* グリッドタブ */}
        {activeTab === "grid" && (
          <div className="p-3 flex justify-center">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${gridCols}, ${FLIP_W}px)`,
                gridTemplateRows: `repeat(${gridRows}, ${FLIP_H}px)`,
                columnGap: "8px",
                rowGap: "12px",
              }}
            >
              {drawnCards.map((placement) => (
                <div
                  key={placement.id}
                  style={{
                    gridColumn: placement.x + 1,
                    gridRow: placement.y + 1,
                    transform: `rotate(${placement.isHorizontal ? 90 : 0}deg)`,
                    transformOrigin: "center center",
                  }}
                  className="flex items-center justify-center"
                >
                  <TarotFlipCard
                    placement={placement}
                    isFlipped={flippedCards.has(placement.id)}
                    onFlip={() => {
                      handleFlip(placement.id);
                      setSelectedCard(
                        flippedCards.has(placement.id) ? placement : null,
                      );
                    }}
                    width={FLIP_W}
                    height={FLIP_H}
                    cardBasePath={cardBasePath}
                  />
                </div>
              ))}
            </div>

            {/* 操作ヒント */}
            <AnimatePresence>
              {showHint && (
                <motion.div
                  className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-30"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                >
                  <div className="bg-white/80 backdrop-blur-sm text-gray-700 px-6 py-1.5 rounded-full shadow border border-gray-100 text-xs">
                    👆 タップしてカードを裏返す
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* カルーセルタブ */}
        {activeTab === "carousel" && drawnCards.length > 0 && (
          <div className="p-4 flex flex-col items-center gap-4">
            {/* メインカード */}
            <TarotFlipCard
              placement={currentCard}
              isFlipped={flippedCards.has(currentCard.id)}
              onFlip={() => handleFlip(currentCard.id)}
              width={120}
              height={Math.round(120 / (300 / 527))}
              cardBasePath={cardBasePath}
            />
            <div className="text-sm font-semibold text-purple-900 text-center">
              {currentCard.position}
              {currentCard.isReversed && (
                <span className="text-red-500 ml-2 text-xs">(逆位置)</span>
              )}
            </div>

            {/* サムネイルナビ */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {drawnCards.map((card, i) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setCarouselIndex(i)}
                  className={`flex-shrink-0 w-8 h-14 rounded border-2 transition-all overflow-hidden ${
                    i === carouselIndex
                      ? "border-purple-500 scale-110"
                      : "border-gray-300 opacity-60"
                  }`}
                >
                  <div className="w-full h-full bg-gradient-to-br from-purple-700 to-indigo-900 flex items-center justify-center text-[10px] font-bold text-white">
                    {card.order}
                  </div>
                </button>
              ))}
            </div>

            {/* 前後ボタン */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() =>
                  setCarouselIndex((i) => Math.max(0, i - 1))
                }
                disabled={carouselIndex === 0}
                className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 disabled:opacity-30 text-sm"
              >
                ← 前
              </button>
              <button
                type="button"
                onClick={() =>
                  setCarouselIndex((i) =>
                    Math.min(drawnCards.length - 1, i + 1),
                  )
                }
                disabled={carouselIndex === drawnCards.length - 1}
                className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 disabled:opacity-30 text-sm"
              >
                次 →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* カード詳細ダイアログ */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
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
                type="button"
                onClick={() => setSelectedCard(null)}
                className="absolute top-3 right-3 p-1.5 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-purple-600 text-white text-sm font-bold rounded-full flex items-center justify-center">
                  {selectedCard.order}
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
              <div className="flex justify-center mb-4">
                <div
                  className="rounded-xl border-4 border-purple-400 shadow-2xl overflow-hidden"
                  style={{
                    width: DIALOG_CARD_WIDTH,
                    height: DIALOG_CARD_WIDTH / CARD_ASPECT,
                  }}
                >
                  <img
                    src={`${cardBasePath}/${selectedCard.card?.code ?? "unknown"}.png`}
                    alt={selectedCard.card?.name ?? ""}
                    className={`w-full h-full object-cover ${
                      selectedCard.isReversed ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>
              <div className="text-sm text-gray-700 mb-2">
                カード:{" "}
                <span className="font-semibold">{selectedCard.card?.name}</span>
                {selectedCard.isReversed && (
                  <span className="text-red-600 ml-2">(逆位置)</span>
                )}
              </div>
              <div className="text-xs text-gray-600">
                キーワード:{" "}
                {selectedCard.isReversed
                  ? selectedCard.card?.reversedKeywords.join("、")
                  : selectedCard.card?.uprightKeywords.join("、")}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
