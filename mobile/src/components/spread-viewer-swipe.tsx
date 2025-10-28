import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { DrawnCard, Spread } from "../../../shared/lib/types";
import { getCardImagePath } from "../lib/utils/salon";
import type { SpreadViewModeType } from "../types";
import CarouselView from "./carousel-view";
import GridView from "./grid-view";

const CARD_ASPECT = 300 / 527;

interface SpreadViewerProps {
  spread: Spread;
  drawnCards: DrawnCard[];
  isRevealingComplete?: boolean;
  setIsRevealingComplete?: (complete: boolean) => void;
}

// メインコンポーネント
const SpreadViewer: React.FC<SpreadViewerProps> = ({
  spread,
  drawnCards,
  isRevealingComplete,
  setIsRevealingComplete,
}) => {
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [selectedCard, setSelectedCard] = useState<DrawnCard | null>(null);
  const [viewMode, setViewMode] = useState<SpreadViewModeType>("grid");

  const dialogCardWidth = 240;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const toggleFlip = (cardId: string): void => {
    setShowHint(false); // 🔥 カードタップでヒントを消す
    const newFlipped = new Set(flippedCards);
    // あったらそのままにする仕様に変更
    if (!newFlipped.has(cardId)) {
      newFlipped.add(cardId);
    }
    setFlippedCards(newFlipped);
  };

  // isRevealingCompleteが、親により、trueになったら、全カードを裏返す
  useEffect(() => {
    if (isRevealingComplete) {
      const allCardIds = drawnCards.map((card) => card.id);
      setFlippedCards(new Set(allCardIds));
    }
  }, [isRevealingComplete, drawnCards]);

  // カードが全部捲られたら後、ダイアログが閉じられたら isRevealingComplete を true にする
  useEffect(() => {
    if (
      flippedCards.size > 0 &&
      flippedCards.size === drawnCards.length &&
      !selectedCard &&
      setIsRevealingComplete
    ) {
      setTimeout(() => {
        console.log(
          "全てのカードが捲られました。isRevealingComplete を true に設定します。"
        );
        setIsRevealingComplete(true);
      }, 1000);
    }
  }, [flippedCards, drawnCards.length, setIsRevealingComplete, selectedCard]);

  const handleCardClick = (card: DrawnCard): void => {
    setSelectedCard(card);
  };

  useEffect(() => {
    if (viewMode === "carousel" && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const thumbnail = container.children[currentIndex];
      if (thumbnail) {
        const containerWidth = container.offsetWidth;
        const thumbnailLeft = (thumbnail as HTMLElement).offsetLeft;
        const thumbnailWidth = (thumbnail as HTMLElement).offsetWidth;
        const scrollPosition =
          thumbnailLeft - containerWidth / 2 + thumbnailWidth / 2;
        container.scrollTo({ left: scrollPosition, behavior: "smooth" });
      }
    }
  }, [currentIndex, viewMode]);

  // 🔥 ヒントを5秒後に自動で消す
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // スワイプ操作のハンドラ
  const [swipeOn, SetSwipeOn] = useState(false);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ): void => {
    const threshold = 50;
    // カルーセルビューでswipeOnがfalseの場合はスワイプ無効化
    if (viewMode === "carousel" && !swipeOn) return;
    if (info.offset.x > threshold) {
      if (viewMode === "carousel") setViewMode("grid");
      else if (viewMode === "grid") setViewMode("carousel");
    } else if (info.offset.x < -threshold) {
      if (viewMode === "grid") setViewMode("carousel");
      else if (viewMode === "carousel") setViewMode("grid");
    }
  };

  return (
    <div className="w-full h-full bg-white flex flex-col">
      <motion.div
        className="w-full flex-1 backdrop-blur-md rounded-2xl sm:p-4
          border border-white/10 relative shadow-xs z-30"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence mode="wait">
          {viewMode === "grid" && (
            <GridView
              key="grid"
              spread={spread}
              drawnCards={drawnCards}
              flippedCards={flippedCards}
              onCardClick={handleCardClick}
              onToggleFlip={toggleFlip}
            />
          )}
          {viewMode === "carousel" && (
            <CarouselView
              key="carousel"
              drawnCards={drawnCards}
              currentIndex={currentIndex}
              flippedCards={flippedCards}
              scrollContainerRef={scrollContainerRef}
              setSwipeOn={SetSwipeOn}
              onIndexChange={setCurrentIndex}
              onCardClick={handleCardClick}
              onToggleFlip={toggleFlip}
            />
          )}
        </AnimatePresence>

        {/* 🔥 操作ヒント - 横長で薄いツールチップ */}
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute bottom-1 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
            >
              <div className="bg-white/60 backdrop-blur-sm text-gray-800 px-8 py-0.5 rounded-full shadow-sm border border-gray-100/40 min-w-[280px]">
                <div className="flex items-center justify-center gap-6 text-[10px] leading-tight">
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      animate={{ y: [0, -2, 0] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="text-sm"
                    >
                      👆
                    </motion.div>
                    <span className="font-medium whitespace-nowrap">
                      タップで裏返し
                    </span>
                  </div>
                  <div className="w-px h-2.5 bg-gray-400/40" />
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      animate={{ x: [-2, 2, -2] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="text-sm"
                    >
                      👈👉
                    </motion.div>
                    <span className="font-medium whitespace-nowrap">
                      スワイプで切替
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="w-full flex justify-center gap-3 p-1 bg-white">
        {(["grid", "carousel"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`w-3 h-3 rounded-full transition-all ${
              viewMode === mode
                ? "bg-purple-400/70 w-8"
                : "bg-purple-200/40 w-1"
            }`}
          />
        ))}
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
                    width: dialogCardWidth,
                    height: dialogCardWidth / CARD_ASPECT,
                  }}
                >
                  <img
                    src={getCardImagePath(selectedCard.card!)}
                    alt={selectedCard.card!.name}
                    className={`w-full h-full object-cover ${
                      selectedCard.isReversed ? "transform rotate-180" : ""
                    }`}
                  />
                </div>
              </div>
              <div className="text-sm text-gray-700 mb-2">
                カード:{" "}
                <span className="font-semibold">{selectedCard.card!.name}</span>
                {selectedCard.isReversed && (
                  <span className="text-red-600 ml-2">(逆位置)</span>
                )}
              </div>
              <div className="text-xs text-gray-600 mb-4">
                キーワード:{" "}
                {selectedCard.isReversed
                  ? selectedCard.card!.reversedKeywords.join("、")
                  : selectedCard.card!.uprightKeywords.join("、")}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpreadViewer;
