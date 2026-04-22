import { motion } from "framer-motion";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CARD_ASPECT } from "../../lib/constants";
import type { DrawnCard, Spread } from "../../lib/types";

// ─────────────────────────────────────────────────────────────
// shared GridView
// mobile/src/components/grid-view.tsx を shared 昇格したもの。
//
// モバイルとの差分:
// - 「基本 4×4 グリッド」: cellSize = コンテナ幅 / 4 を基準にカードを大きめ表示。
//   maxX+1 > 4 / maxY+1 > 4 のスプレッドは overflow-auto でスクロール。
// - 画像パスは `cardBasePath` / `cardBackPath` prop で受ける（shared のため
//   mobile/src/lib/utils/salon の getCardImagePath に依存しない）。
// - それ以外（正方形セル・ケルト十字 z-index 3 秒交互入替・flip アニメ・
//   裏面 numbered badge・descriptive スプレッド名バッジ）はモバイル同一。
// ─────────────────────────────────────────────────────────────

interface GridViewProps {
  spread: Spread;
  drawnCards: DrawnCard[];
  flippedCards: Set<string>;
  onCardClick: (card: DrawnCard) => void;
  onToggleFlip: (cardId: string) => void;
  cardBasePath?: string;
  cardBackPath?: string;
  /** 基本グリッド最小列数（デフォルト 4）*/
  minCols?: number;
  /** 基本グリッド最小行数（デフォルト 4）*/
  minRows?: number;
}

export const GridView: React.FC<GridViewProps> = ({
  spread,
  drawnCards,
  flippedCards,
  onCardClick,
  onToggleFlip,
  cardBasePath = "/cards",
  cardBackPath = "/cards/back.png",
  minCols = 4,
  minRows = 4,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });
  const topPadding = 56;
  const sidePadding = 16;
  const bottomPadding = 16;

  useLayoutEffect(() => {
    const updateViewSize = () => {
      if (containerRef.current) {
        setViewSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
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

  const maxX = drawnCards.length > 0 ? Math.max(...drawnCards.map((c) => c.x)) : 0;
  const maxY = drawnCards.length > 0 ? Math.max(...drawnCards.map((c) => c.y)) : 0;

  // 表示列数 = max(minCols, スプレッド列数)
  const cols = Math.max(minCols, maxX + 1);
  const rows = Math.max(minRows, maxY + 1);

  const colGap = 8;
  const rowGap = 8;

  // 4x4 を基本表示領域として、幅・高さの両方からセルサイズを逆算する。
  // カードそのものは CARD_ASPECT を維持し、4x4 を超える盤面はスクロールで見せる。
  const visibleCols = Math.min(cols, minCols);
  const visibleRows = Math.min(rows, minRows);
  const availableWidth =
    viewSize.width - sidePadding * 2 - colGap * Math.max(visibleCols - 1, 0);
  const availableHeight =
    viewSize.height -
    topPadding -
    bottomPadding -
    rowGap * Math.max(visibleRows - 1, 0);
  const cellSize =
    availableWidth > 0 && availableHeight > 0
      ? Math.max(
          0,
          Math.floor(
            Math.min(
              availableWidth / Math.max(visibleCols, 1),
              availableHeight / Math.max(visibleRows, 1),
            ),
          ),
        )
      : 0;

  const cardHeight = cellSize;
  const cardWidth = cardHeight * CARD_ASPECT;
  const gridWidth = cols * cellSize + Math.max(cols - 1, 0) * colGap;
  const gridHeight = rows * cellSize + Math.max(rows - 1, 0) * rowGap;

  // ケルト十字: 1 枚目と 2 枚目の z-index を 3 秒ごとに交互入替
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

  const handleCardInteraction = (card: DrawnCard) => {
    onCardClick(card);
    onToggleFlip(card.id);
  };

  const getCardImagePath = (card: DrawnCard["card"]): string =>
    `${cardBasePath}/${card?.code ?? "unknown"}.png`;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-auto"
    >
      {/* スプレッド名バッジ */}
      {spread && (
        <motion.div
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: 10, opacity: 0 }}
          transition={{ duration: 3, delay: 10 }}
          className="absolute top-4 z-30 pointer-events-none"
        >
          <div className="relative bg-white/70 backdrop-blur-sm text-purple-600/70 px-2 py-1 rounded-full shadow-sm border border-purple-100/40">
            <div className="flex gap-2 whitespace-nowrap">
              <span className="text-sm font-normal tracking-wide opacity-70">
                {spread.name}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {cellSize > 0 && (
        <div
          className="min-w-full min-h-full flex items-center justify-center"
          style={{
            paddingTop: `${topPadding}px`,
            paddingRight: `${sidePadding}px`,
            paddingBottom: `${bottomPadding}px`,
            paddingLeft: `${sidePadding}px`,
          }}
        >
          <div
            className="relative"
            style={{
              width: `${gridWidth}px`,
              height: `${gridHeight}px`,
            }}
          >
            <div
              className="relative mx-auto"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
                columnGap: `${colGap}px`,
                rowGap: `${rowGap}px`,
                placeItems: "center",
              }}
            >
              {drawnCards.map((card, index) => {
                const isHorizontal = card.isHorizontal;
                const displayWidth = isHorizontal ? cardHeight : cardWidth;
                const displayHeight = isHorizontal ? cardWidth : cardHeight;
                const isFlipped = flippedCards.has(card.id);

                const rotation =
                  (isHorizontal ? -90 : 0) + (card.isReversed ? 180 : 0);
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
                        <img src={cardBackPath} alt="Card Back" style={backImgStyle} />
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
                          src={getCardImagePath(card.card)}
                          alt={card.card?.name ?? ""}
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
        </div>
      )}
    </div>
  );
};
