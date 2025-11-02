import AutoHeight from "embla-carousel-auto-height";
import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSalon } from "../lib/hooks/use-salon";
import type { UserPlan } from "../types";
import CategorySpreadSelector from "./category-spread-selector";
import { ChatPanel } from "./chat-panel";
import UpgradeGuide from "./upgrade-guide";

interface LowerViewerProps {
  handleChangePlan: (targetPlan: UserPlan) => void;
  handleStartReading: () => void;
  isChangingPlan: boolean;
  onBack: () => void;
}

const LowerViewer: React.FC<LowerViewerProps> = ({
  handleChangePlan,
  handleStartReading,
  isChangingPlan,
  onBack,
}) => {
  const { isPersonal, setIsPersonal, lowerViewerMode, setLowerViewerMode } =
    useSalon();
  const [showHint, setShowHint] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const autoHeight = useRef(AutoHeight());

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: false,
      startIndex: 0,
      skipSnaps: false,
      dragFree: false,
    },
    [autoHeight.current]
  );

  useEffect(() => {
    setLowerViewerMode("selector");
    setIsPersonal(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    setLowerViewerMode(index === 0 ? "selector" : "personal");
    setIsPersonal(index === 1);
  }, [emblaApi, setLowerViewerMode, setIsPersonal]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    const targetIndex = lowerViewerMode === "selector" ? 0 : 1;
    if (selectedIndex !== targetIndex) {
      emblaApi.scrollTo(targetIndex);
    }
  }, [lowerViewerMode, emblaApi, selectedIndex]);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* ビューモード切替ボタン */}
      <div className="w-full flex justify-center gap-3 p-1">
        {(["selector", "personal"] as const).map((mode, index) => (
          <button
            key={mode}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`w-24 h-4 text-xs rounded-full transition-all ${
              selectedIndex === index ? "bg-purple-400/70" : "bg-purple-200/40"
            }`}
          >
            {mode === "selector" ? "クイック占い" : "パーソナル占い"}
          </button>
        ))}
      </div>

      {/* Embla Carousel */}
      <div className="embla relative h-full" ref={emblaRef}>
        <div className="embla__container flex h-full">
          {/* スライド1: 選択画面 */}
          <div className="embla__slide flex-[0_0_100%] min-w-0 h-full">
            {/* 🔥 このスライド内でスクロール */}
            <div className="w-full h-full overflow-y-auto px-1 pb-4">
              <CategorySpreadSelector handleStartReading={handleStartReading} />
              <UpgradeGuide
                handleChangePlan={handleChangePlan}
                isChangingPlan={isChangingPlan}
              />
            </div>
          </div>

          {/* スライド2: パーソナル占い画面 */}
          <div className="embla__slide flex-[0_0_100%] min-w-0 h-full">
            {/* 🔥 このスライド内でスクロール */}
            <div className="w-full h-full overflow-y-auto px-1 pb-4">
              {selectedIndex === 1 && isPersonal && (
                <ChatPanel key={"personal"} onBack={onBack} />
              )}
            </div>
          </div>
        </div>

        {/* 操作ヒント */}
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
            >
              <div className="bg-white/60 backdrop-blur-sm text-gray-800 px-8 py-2 rounded-full shadow-sm border border-gray-100/40 min-w-[280px]">
                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      animate={{ y: [0, -2, 0] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="whitespace-nowrap"
                    >
                      👈👉
                    </motion.div>
                    <span className="font-medium whitespace-nowrap">
                      スワイプで占い方を選べます
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default LowerViewer;
