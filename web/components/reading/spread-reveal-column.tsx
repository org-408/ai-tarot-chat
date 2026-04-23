"use client";

import { CarouselView } from "@shared/components/tarot/carousel-view";
import { GridView } from "@shared/components/tarot/grid-view";
import { CARD_ASPECT } from "@shared/lib/constants";
import type { DrawnCard, Spread } from "@shared/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ViewMode = "grid" | "carousel";

interface SpreadRevealColumnProps {
  spread: Spread;
  drawnCards: DrawnCard[];
  isRevealingCompleted: boolean;
  onRevealAll: () => void;
  onRevealingCompleted?: () => void;
  revealAllLabel: string;
  revealPromptLabel: string;
  allRevealedLabel: string;
  gridLabel: string;
  carouselLabel: string;
  positionLabel: string;
  cardLabel: string;
  keywordsLabel: string;
  reversedLabel: string;
}

/**
 * 右カラム: スプレッド表示。
 * - モバイル同等の GridView（正方形セル・ケルト十字 z-index 交互入替）
 * - タブで個別表示（CarouselView）に切替。Web では大きく中央寄せ表示
 * - 最下部に「一気にめくる」ボタン
 * - カードタップで詳細ダイアログ
 */
export function SpreadRevealColumn({
  spread,
  drawnCards,
  isRevealingCompleted,
  onRevealAll,
  onRevealingCompleted,
  revealAllLabel,
  revealPromptLabel,
  allRevealedLabel,
  gridLabel,
  carouselLabel,
  positionLabel,
  cardLabel,
  keywordsLabel,
  reversedLabel,
}: SpreadRevealColumnProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [selectedCard, setSelectedCard] = useState<DrawnCard | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // 外部 isRevealingCompleted=true → 全カード裏返し反映
  useEffect(() => {
    if (isRevealingCompleted) {
      setFlippedCards(new Set(drawnCards.map((c) => c.id)));
    }
  }, [isRevealingCompleted, drawnCards]);

  // 全カードめくり完了通知（ユーザーが個別にめくって最後の 1 枚が開いたときも）
  useEffect(() => {
    if (
      !isRevealingCompleted &&
      drawnCards.length > 0 &&
      flippedCards.size === drawnCards.length &&
      !selectedCard &&
      onRevealingCompleted
    ) {
      const t = setTimeout(() => {
        onRevealingCompleted();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [
    flippedCards,
    drawnCards,
    selectedCard,
    isRevealingCompleted,
    onRevealingCompleted,
  ]);

  const toggleFlip = useCallback((cardId: string) => {
    setFlippedCards((prev) => {
      if (prev.has(cardId)) return prev;
      const next = new Set(prev);
      next.add(cardId);
      return next;
    });
  }, []);

  const handleCardClick = useCallback((card: DrawnCard) => {
    setSelectedCard(card);
  }, []);

  const DIALOG_CARD_WIDTH = 220;

  return (
    <div className="flex flex-col h-full relative">
      {/* タブ */}
      <div className="flex-shrink-0 w-full flex justify-center gap-3 p-2 bg-white border-b border-purple-100">
        {(["grid", "carousel"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`px-4 h-7 text-xs rounded-full transition-all ${
              viewMode === mode
                ? "bg-purple-400/70 text-white font-semibold"
                : "bg-purple-100/60 text-purple-700"
            }`}
          >
            {mode === "grid" ? gridLabel : carouselLabel}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === "grid" ? (
          <GridView
            spread={spread}
            drawnCards={drawnCards}
            flippedCards={flippedCards}
            onCardClick={handleCardClick}
            onToggleFlip={toggleFlip}
          />
        ) : (
          <CarouselView
            drawnCards={drawnCards}
            currentIndex={carouselIndex}
            flippedCards={flippedCards}
            onIndexChange={setCarouselIndex}
            onCardClick={handleCardClick}
            onToggleFlip={toggleFlip}
          />
        )}
      </div>

      {/* 最下部: 一気にめくるボタン or 完了ラベル */}
      {!isRevealingCompleted && drawnCards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 px-4 py-3 border-t border-purple-100 bg-white"
        >
          <motion.div
            className="text-center mb-2"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          >
            <p className="text-xs text-gray-600">{revealPromptLabel}</p>
          </motion.div>
          <button
            type="button"
            onClick={onRevealAll}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold shadow-lg hover:from-purple-600 hover:to-pink-600 active:scale-95 transition-all"
          >
            {revealAllLabel}
          </button>
        </motion.div>
      )}

      {isRevealingCompleted && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-purple-100 bg-white text-center">
          <p className="text-xs text-purple-600 font-medium">
            {allRevealedLabel}
          </p>
        </div>
      )}

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
                  {positionLabel}: {selectedCard.position}
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
                    src={`/cards/${selectedCard.card?.code ?? "unknown"}.png`}
                    alt={selectedCard.card?.name ?? ""}
                    className={`w-full h-full object-cover ${
                      selectedCard.isReversed ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>
              <div className="text-sm text-gray-700 mb-2">
                {cardLabel}:{" "}
                <span className="font-semibold">
                  {selectedCard.card?.name}
                </span>
                {selectedCard.isReversed && (
                  <span className="text-red-600 ml-2">({reversedLabel})</span>
                )}
              </div>
              <div className="text-xs text-gray-600">
                {keywordsLabel}:{" "}
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
}
