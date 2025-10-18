import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { Spread, TarotCard } from "../../../shared/lib/types";
import type { CardPlacement } from "../types";
import CarouselView from "./CarouselView";
import GridView from "./GridView";

// 型定義
type ViewModeType = "grid" | "carousel";

const CARD_ASPECT = 300 / 527;

interface TarotSpreadViewerProps {
  spread: Spread;
  drawnCards: CardPlacement[];
  onCardClick?: (card: CardPlacement) => void;
}

// メインコンポーネント
const TarotSpreadViewer: React.FC<TarotSpreadViewerProps> = ({
  spread,
  drawnCards,
  onCardClick,
}) => {
  const dialogCardWidth = 240;
  const [viewMode, setViewMode] = useState<ViewModeType>("grid");
  const [selectedCard, setSelectedCard] = useState<CardPlacement | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const toggleFlip = (cardId: string): void => {
    const newFlipped = new Set(flippedCards);
    // めくったらそのままにする仕様に変更
    if (!newFlipped.has(cardId)) {
      newFlipped.add(cardId);
    }
    setFlippedCards(newFlipped);
  };

  const handleCardClick = (card: CardPlacement): void => {
    setSelectedCard(card);
    onCardClick?.(card);
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

  const getCardImagePath = (
    card: TarotCard,
    isBack: boolean = false
  ): string => {
    if (isBack) {
      return "/cards/back.png";
    }
    return `/cards/${card.code}.png`;
  };

  return (
    <div className="w-full h-full">
      <motion.div
        className="bg-white/5 backdrop-blur-md rounded-2xl sm:p-4 border border-white/10"
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
              getCardImagePath={getCardImagePath}
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
              getCardImagePath={getCardImagePath}
            />
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex justify-center gap-2 mt-3">
        {(["grid", "carousel"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`w-2 h-2 rounded-full transition-all ${
              viewMode === mode ? "bg-white w-6" : "bg-white/30"
            }`}
          />
        ))}
      </div>

      <div className="mt-3 text-center text-black/70 text-xs sm:text-sm px-2">
        {"← ビューをスワイプで切替 →　カードをタップで裏返し"}
      </div>

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
                  {selectedCard.number}
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
                    src={getCardImagePath(selectedCard.card)}
                    alt={selectedCard.card.name}
                    className={`w-full h-full object-cover ${
                      selectedCard.isReversed ? "transform rotate-180" : ""
                    }`}
                  />
                </div>
              </div>
              <div className="text-sm text-gray-700 mb-2">
                カード:{" "}
                <span className="font-semibold">{selectedCard.card.name}</span>
                {selectedCard.isReversed && (
                  <span className="text-red-600 ml-2">(逆位置)</span>
                )}
              </div>
              <div className="text-xs text-gray-600 mb-4">
                キーワード:{" "}
                {selectedCard.isReversed
                  ? selectedCard.card.reversedKeywords.join("、")
                  : selectedCard.card.uprightKeywords.join("、")}
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 font-medium transition-colors text-sm"
              >
                閉じる
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TarotSpreadViewer;
