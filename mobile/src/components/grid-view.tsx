import { motion } from "framer-motion";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DrawnCard, Spread } from "../../../shared/lib/types";
import { getCardImagePath } from "../lib/utils/salon";

const CARD_ASPECT = 300 / 527;

interface GridViewProps {
  spread: Spread;
  drawnCards: DrawnCard[];
  flippedCards: Set<string>;
  onCardClick: (card: DrawnCard) => void;
  onToggleFlip: (cardId: string) => void;
}

// グリッドコンポーネント
const GridView: React.FC<GridViewProps> = ({
  spread,
  drawnCards,
  flippedCards,
  onCardClick,
  onToggleFlip,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewWidth, setViewWidth] = useState(0);
  const [viewHeight, setViewHeight] = useState(0);

  useLayoutEffect(() => {
    const updateViewSize = () => {
      if (containerRef.current) {
        setViewWidth(containerRef.current.offsetWidth);
        setViewHeight(containerRef.current.offsetHeight);
        console.log("Updated view size:", {
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateViewSize();

    let observer: ResizeObserver | undefined;
    if (containerRef.current && typeof window.ResizeObserver !== "undefined") {
      observer = new window.ResizeObserver(updateViewSize);
      observer.observe(containerRef.current);
    }
    window.addEventListener("resize", updateViewSize);

    return () => {
      window.removeEventListener("resize", updateViewSize);
      if (observer) observer.disconnect();
    };
  }, []);

  const maxX = Math.max(...drawnCards.map((c) => c.x));
  const maxY = Math.max(...drawnCards.map((c) => c.y));

  const colGap = 8;
  const rowGap = 8;

  const cardHeight = Math.min(
    (viewWidth - colGap * maxX) / (maxX + 1),
    (viewHeight - rowGap * maxY) / (maxY + 1)
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
  const handleCardInteraction = (card: DrawnCard) => {
    onCardClick(card);
    onToggleFlip(card.id);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-x-auto flex justify-center items-center relative"
    >
      {/* 🔥 スプレッド名 -洗練されたバッジ */}
      {spread && (
        <motion.div
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: 10, opacity: 0 }}
          transition={{ duration: 3, delay: 10 }}
          className="absolute top-8 z-30 pointer-events-none"
        >
          <div className="relative">
            {/* バッジ本体 - 淡い色で控えめに、横幅を広く */}
            <div className="relative bg-white/70 backdrop-blur-sm text-purple-600/70 px-2 py-1 rounded-full shadow-sm border border-purple-100/40">
              <div className="flex gap-2 whitespace-nowrap">
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
        }}
      >
        {drawnCards.map((card, index) => {
          const isHorizontal = card.isHorizontal;
          const displayWidth = isHorizontal ? cardHeight : cardWidth;
          const displayHeight = isHorizontal ? cardWidth : cardHeight;
          const isFlipped = flippedCards.has(card.id);

          const rotation = (isHorizontal ? -90 : 0) + (card.isReversed ? 180 : 0);
          const imgStyle: React.CSSProperties = isHorizontal
            ? {
                position: "absolute",
                top: "50%",
                left: "50%",
                width: `${displayHeight}px`,
                height: `${displayWidth}px`,
                objectFit: "cover",
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              }
            : {
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: card.isReversed ? "rotate(180deg)" : undefined,
              };
          const backImgStyle: React.CSSProperties = isHorizontal
            ? {
                position: "absolute",
                top: "50%",
                left: "50%",
                width: `${displayHeight}px`,
                height: `${displayWidth}px`,
                objectFit: "cover",
                transform: "translate(-50%, -50%) rotate(-90deg)",
              }
            : { width: "100%", height: "100%", objectFit: "cover" };

          return (
            <motion.div
              key={card.id}
              style={{
                gridColumn: card.x + 1,
                gridRow: card.y + 1,
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                justifySelf: "center",
                alignSelf: "center",
                zIndex: getZIndex(card.order),
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
                    src={getCardImagePath(card.card!, true)}
                    alt="Card Back"
                    style={backImgStyle}
                  />
                  {!isFlipped && (
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white/90 text-purple-900 rounded-full flex items-center justify-center text-[10px] font-bold z-10">
                      {card.order}
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
                    src={getCardImagePath(card.card!)}
                    alt={card.card!.name}
                    style={imgStyle}
                  />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white/90 text-purple-900 rounded-full flex items-center justify-center text-[10px] font-bold z-10">
                    {card.order}
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
