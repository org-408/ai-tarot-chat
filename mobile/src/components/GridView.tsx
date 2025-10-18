import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import type {
  CardPlacement,
  Spread,
  TarotCard,
} from "../../../shared/lib/types";

const CARD_ASPECT = 300 / 527;

const VIEW_WIDTH_MAX = 378;
const VIEW_HEIGHT_MAX = 300;

interface GridViewProps {
  spread: Spread;
  drawnCards: CardPlacement[];
  flippedCards: Set<string>;
  onCardClick: (card: CardPlacement) => void;
  onToggleFlip: (cardId: string) => void;
  getCardImagePath: (card: TarotCard, isBack?: boolean) => string;
}

// グリッドコンポーネント
const GridView: React.FC<GridViewProps> = ({
  spread,
  drawnCards,
  flippedCards,
  onCardClick,
  onToggleFlip,
  getCardImagePath,
}) => {
  const maxX = Math.max(...drawnCards.map((c) => c.gridX));
  const maxY = Math.max(...drawnCards.map((c) => c.gridY));

  const GRID_WIDTH_MAX = 4;
  const GRID_HEIGHT_MAX = 4;

  const colGap = 8;
  const rowGap = 8;

  const cardHeight = Math.min(
    (VIEW_WIDTH_MAX - colGap * 2) / Math.min(maxX + 1, GRID_WIDTH_MAX),
    (VIEW_HEIGHT_MAX - rowGap * 2) / Math.min(maxY + 1, GRID_HEIGHT_MAX)
  );
  const cardWidth = cardHeight * CARD_ASPECT;
  const cellSize = cardHeight;

  const [crossFlipState, setCrossFlipState] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCrossFlipState((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getZIndex = (cardNumber: number): number => {
    if (cardNumber === 1) return crossFlipState ? 20 : 10;
    if (cardNumber === 2) return crossFlipState ? 10 : 20;
    return 5;
  };

  // カードがタップされた時の処理
  const handleCardInteraction = (card: CardPlacement) => {
    onCardClick(card);
    onToggleFlip(card.id);
  };

  return (
    <div
      className="overflow-x-auto pb-2 flex justify-center items-center relative"
      style={{
        width: `${VIEW_WIDTH_MAX}px`,
        height: `${VIEW_HEIGHT_MAX}px`,
      }}
    >
      {/* 🔥 スプレッド名 -洗練されたバッジ */}
      {spread && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="absolute top-0.5 right-0.5 z-30 pointer-events-none"
        >
          <div className="relative">
            {/* 背景のグロー効果 - より控えめに */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.15, 0.25, 0.15],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 bg-purple-500 blur-lg rounded-full"
            />

            {/* バッジ本体 - 淡い色で控えめに、横幅を広く */}
            <div className="relative bg-white/20 backdrop-blur-sm text-purple-600/70 px-8 py-1 rounded-full shadow-sm border border-purple-100/40">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-sm font-normal tracking-wide opacity-70">
                  {spread.name}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div
        className="relative mx-auto"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${maxX + 1}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${maxY + 1}, ${cellSize}px)`,
          columnGap: `${colGap}px`,
          rowGap: `${rowGap}px`,
          minWidth: "300px",
        }}
      >
        {drawnCards.map((card, index) => {
          const isHorizontal = card.rotation === 90;
          const displayWidth = isHorizontal ? cardHeight : cardWidth;
          const displayHeight = isHorizontal ? cardWidth : cardHeight;
          const isFlipped = flippedCards.has(card.id);

          return (
            <motion.div
              key={card.id}
              style={{
                gridColumn: card.gridX + 1,
                gridRow: card.gridY + 1,
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                justifySelf: "center",
                alignSelf: "center",
                zIndex: getZIndex(card.number),
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: index * 0.08,
                type: "spring",
                stiffness: 150,
                zIndex: { duration: 0.5 },
              }}
              whileHover={{ scale: 1.15, zIndex: 50 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCardInteraction(card)}
              className="cursor-pointer"
            >
              <motion.div
                className="relative w-full h-full"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* 裏面 */}
                <div
                  className="absolute inset-0 rounded-lg border-2 border-purple-400 shadow-lg overflow-hidden"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <img
                    src={getCardImagePath(card.card, true)}
                    alt="Card Back"
                    className="w-full h-full object-cover"
                  />
                  {!isFlipped && (
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white/90 text-purple-900 rounded-full flex items-center justify-center text-[10px] font-bold z-10">
                      {card.number}
                    </div>
                  )}
                </div>
                {/* 表面 */}
                <div
                  className="absolute inset-0 rounded-lg border-2 border-white shadow-lg overflow-hidden"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <img
                    src={getCardImagePath(card.card)}
                    alt={card.card.name}
                    className={`w-full h-full object-cover ${
                      card.isReversed ? "transform rotate-180" : ""
                    }`}
                  />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white/90 text-purple-900 rounded-full flex items-center justify-center text-[10px] font-bold z-10">
                    {card.number}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default GridView;
