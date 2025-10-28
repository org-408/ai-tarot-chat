import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

interface SwipeableContainerProps {
  children: React.ReactNode[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  showIndicators?: boolean;
  showHint?: boolean;
  hintDuration?: number;
  className?: string;
}

/**
 * 汎用スワイプコンテナ
 * 上半分・下半分どちらでも使える設計
 * Embla Carouselベース
 */
const SwipeableContainer: React.FC<SwipeableContainerProps> = ({
  children,
  activeIndex,
  onIndexChange,
  showIndicators = true,
  showHint = true,
  hintDuration = 5000,
  className = "",
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    skipSnaps: false,
    dragFree: false,
    startIndex: activeIndex,
  });

  const [showSwipeHint, setShowSwipeHint] = useState(showHint);

  // Emblaのインデックス変更を検知
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    if (index !== activeIndex) {
      onIndexChange(index);
    }
    // スワイプしたらヒントを消す
    setShowSwipeHint(false);
  }, [emblaApi, activeIndex, onIndexChange]);

  // Emblaのイベント設定
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  // 外部からのインデックス変更に追従
  useEffect(() => {
    if (!emblaApi) return;
    const currentIndex = emblaApi.selectedScrollSnap();
    if (currentIndex !== activeIndex) {
      emblaApi.scrollTo(activeIndex, false);
    }
  }, [activeIndex, emblaApi]);

  // ヒントの自動非表示
  useEffect(() => {
    if (!showHint) return;
    const timer = setTimeout(() => {
      setShowSwipeHint(false);
    }, hintDuration);
    return () => clearTimeout(timer);
  }, [showHint, hintDuration]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Emblaコンテナ */}
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {children.map((child, index) => (
            <div key={index} className="flex-[0_0_100%] min-w-0 h-full">
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* インジケーター */}
      {showIndicators && children.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {children.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`rounded-full transition-all ${
                index === activeIndex
                  ? "bg-purple-400/70 w-8 h-3"
                  : "bg-purple-200/40 w-3 h-3"
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            />
          ))}
        </div>
      )}

      {/* スワイプヒント */}
      <AnimatePresence>
        {showSwipeHint && children.length > 1 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="bg-white/60 backdrop-blur-sm text-gray-800 px-6 py-1 rounded-full shadow-sm border border-gray-100/40">
              <div className="flex items-center gap-2 text-xs">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SwipeableContainer;
