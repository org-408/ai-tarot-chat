import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CARD_ASPECT, MAX_CARD_HEIGHT } from "../../lib/constants";
import type { DrawnCard } from "../../lib/types";

// ─────────────────────────────────────────────────────────────
// shared CarouselView
// mobile/src/components/carousel-view.tsx を shared 昇格したもの。
//
// モバイルとの差分:
// - カードを大きく表示: モバイルの VIEW_HEIGHT_MAX=300px 固定に対し、
//   Web ではコンテナ高さ／幅からアスペクト比を保ちつつ最大化（上限 min(h-padding, w*CARD_ASPECT)）
// - 常時中央寄せ
// - 画像パスは `cardBasePath` / `cardBackPath` prop で受ける
// - それ以外の挙動（embla swipe、左右ナビボタン、ドットインジケーター、
//   flip アニメ、裏面 numbered badge）はモバイル同一
// ─────────────────────────────────────────────────────────────

interface CarouselViewProps {
  drawnCards: DrawnCard[];
  currentIndex: number;
  flippedCards: Set<string>;
  onIndexChange: (index: number) => void;
  onCardClick: (card: DrawnCard) => void;
  onToggleFlip: (cardId: string) => void;
  cardBasePath?: string;
  cardBackPath?: string;
  /** カード高さの最大値 (px)。コンテナが足りなければそちらに合わせる */
  maxCardHeight?: number;
}

export const CarouselView: React.FC<CarouselViewProps> = ({
  drawnCards,
  currentIndex,
  flippedCards,
  onIndexChange,
  onCardClick,
  onToggleFlip,
  cardBasePath = "/cards",
  cardBackPath = "/cards/back.png",
  maxCardHeight = MAX_CARD_HEIGHT,
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    skipSnaps: false,
    dragFree: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useLayoutEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
        setContainerHeight(containerRef.current.offsetHeight);
      }
    };
    update();
    let observer: ResizeObserver | undefined;
    if (containerRef.current && typeof window.ResizeObserver !== "undefined") {
      observer = new window.ResizeObserver(update);
      observer.observe(containerRef.current);
    }
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      if (observer) observer.disconnect();
    };
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    onIndexChange(index);
  }, [emblaApi, onIndexChange]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi && currentIndex !== selectedIndex) {
      emblaApi.scrollTo(currentIndex);
    }
  }, [currentIndex, emblaApi, selectedIndex]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // カード表示サイズ: コンテナ幅・高さから最大まで拡張（ドット等で使う余白を考慮）
  const DOT_AREA = 40; // ドットインジケーター実測 mt-4(16)+h-2(8)+mb-2(8)=32 + 安全 8
  const V_PADDING = 8;
  const H_PADDING = 72; // prev/next ボタン実測 ~36px × 2
  const availableHeight = Math.max(0, containerHeight - DOT_AREA - V_PADDING);
  const availableWidth = Math.max(0, containerWidth - H_PADDING);
  const byHeight = availableHeight;
  const byWidth = availableWidth / CARD_ASPECT;
  const cardHeight = Math.min(maxCardHeight, byHeight, byWidth) || 0;
  const cardWidth = cardHeight * CARD_ASPECT;

  const handleCardInteraction = (card: DrawnCard) => {
    onCardClick(card);
    onToggleFlip(card.id);
  };

  const getCardImagePath = (card: DrawnCard["card"]): string =>
    `${cardBasePath}/${card?.code ?? "unknown"}.png`;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-center"
    >
      {/* メインカルーセル */}
      <div className="overflow-hidden w-full flex-1 flex items-center" ref={emblaRef}>
        <div className="flex touch-pan-y w-full">
          {drawnCards.map((card) => {
            const isFlipped = flippedCards.has(card.id);

            return (
              <div
                key={card.id}
                className="flex-[0_0_100%] min-w-0 flex items-center justify-center"
              >
                <motion.div
                  className="relative cursor-pointer mx-auto"
                  style={{ width: cardWidth, height: cardHeight }}
                  onClick={() => handleCardInteraction(card)}
                >
                  <motion.div
                    className="relative w-full h-full"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6 }}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {/* 裏面 */}
                    <div
                      className="absolute inset-0 rounded-2xl border-4 border-purple-400 shadow-2xl overflow-hidden"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <img
                        src={cardBackPath}
                        alt="Card Back"
                        className="w-full h-full object-cover"
                      />
                      {!isFlipped && (
                        <div className="absolute top-2 left-2 w-8 h-8 bg-white/90 text-purple-900 rounded-full flex items-center justify-center text-sm font-bold z-10">
                          {card.order}
                        </div>
                      )}
                    </div>
                    {/* 表面 */}
                    <div
                      className="absolute inset-0 rounded-2xl border-4 border-white shadow-2xl overflow-hidden"
                      style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                      }}
                    >
                      <img
                        src={getCardImagePath(card.card)}
                        alt={card.card?.name ?? ""}
                        className={`w-full h-full object-cover ${
                          card.isReversed ? "transform rotate-180" : ""
                        }`}
                      />
                      <div className="absolute top-2 left-2 w-8 h-8 bg-white/90 text-purple-900 rounded-full flex items-center justify-center text-sm font-bold z-10">
                        {card.order}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ドットインジケーター */}
      <div className="flex justify-center gap-2 mt-4 mb-2">
        {drawnCards.map((_, index) => (
          <button
            key={index}
            type="button"
            className={`h-2 rounded-full transition-all ${
              index === selectedIndex ? "w-8 bg-purple-500" : "w-2 bg-gray-400"
            }`}
            onClick={() => emblaApi?.scrollTo(index)}
          />
        ))}
      </div>

      {/* 左右ナビゲーションボタン */}
      <button
        type="button"
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg z-10 transition-all"
        onClick={scrollPrev}
      >
        <span className="text-2xl">＜</span>
      </button>
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg z-10 transition-all"
        onClick={scrollNext}
      >
        <span className="text-2xl">＞</span>
      </button>
    </div>
  );
};
