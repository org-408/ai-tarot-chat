import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import React, { useCallback, useEffect, useState } from "react";
import type { TarotCard } from "../../../shared/lib/types";
import type { CardPlacement } from "../types";

const CARD_ASPECT = 300 / 527;

const VIEW_HEIGHT_MAX = 300;

// カルーセルコンポーネント
interface CarouselViewProps {
  drawnCards: CardPlacement[];
  currentIndex: number;
  flippedCards: Set<string>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  setSwipeOn: (swipeOn: boolean) => void;
  onIndexChange: (index: number) => void;
  onCardClick: (card: CardPlacement) => void;
  onToggleFlip: (cardId: string) => void;
  getCardImagePath: (card: TarotCard, isBack?: boolean) => string;
}

const CarouselView: React.FC<CarouselViewProps> = ({
  drawnCards,
  currentIndex,
  flippedCards,
  setSwipeOn,
  onIndexChange,
  onCardClick,
  onToggleFlip,
  getCardImagePath,
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true, // ← ぐるぐる回せるように
    align: "center",
    skipSnaps: false,
    dragFree: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(currentIndex);

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

  const cardHeight = VIEW_HEIGHT_MAX - 14 * 2;
  const cardWidth = cardHeight * CARD_ASPECT;

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center"
      style={{ height: `${VIEW_HEIGHT_MAX}px` }}
    >
      {/* メインカルーセル */}
      <div
        className="overflow-hidden w-full"
        ref={emblaRef}
        onPointerDown={() => {
          setSwipeOn(true);
        }}
      >
        <div className="flex touch-pan-y">
          {drawnCards.map((card) => {
            const isFlipped = flippedCards.has(card.id);

            return (
              <div key={card.id} className="flex-[0_0_100%] min-w-0">
                <motion.div
                  className="relative cursor-pointer mx-auto"
                  style={{ width: cardWidth, height: cardWidth / CARD_ASPECT }}
                  onClick={() => {
                    if (isFlipped) onCardClick(card);
                    onToggleFlip(card.id);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSwipeOn(false);
                  }}
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
                        src={getCardImagePath(card.card, true)}
                        alt="Card Back"
                        className="w-full h-full object-cover"
                      />
                      {!isFlipped && (
                        <div className="absolute top-2 left-2 w-8 h-8 bg-white/90 text-purple-900 rounded-full flex items-center justify-center text-sm font-bold z-10">
                          {card.number}
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
                      <div className="relative w-full h-full">
                        <img
                          src={getCardImagePath(card.card)}
                          alt={card.card.name}
                          className={`w-full h-full object-cover ${
                            card.isReversed ? "transform rotate-180" : ""
                          }`}
                        />
                        <div className="absolute top-2 left-2 w-8 h-8 bg-white/90 text-purple-900 rounded-full flex items-center justify-center text-sm font-bold z-10">
                          {card.number}
                        </div>
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
      <div className="flex justify-center gap-2 mt-4">
        {drawnCards.map((_, index) => (
          <button
            key={index}
            className={`h-2 rounded-full transition-all ${
              index === selectedIndex ? "w-8 bg-purple-500" : "w-2 bg-gray-400" // ← gray-400に変更
            }`}
            onClick={() => emblaApi?.scrollTo(index)}
          />
        ))}
      </div>

      {/* 左右ナビゲーションボタン */}
      <button
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg z-10 transition-all"
        onClick={scrollPrev}
      >
        <span className="text-2xl">＜</span>
      </button>
      <button
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg z-10 transition-all"
        onClick={scrollNext}
      >
        <span className="text-2xl">＞</span>
      </button>
    </div>
  );
};

export default CarouselView;
