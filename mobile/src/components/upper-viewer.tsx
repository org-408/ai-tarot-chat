import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { DrawnCard, Spread } from "../../../shared/lib/types";
import { useMaster } from "../lib/hooks/use-master";
import { useSalon } from "../lib/hooks/use-salon";
import { getCardImagePath } from "../lib/utils/salon";
import CarouselView from "./carousel-view";
import GridView from "./grid-view";
import TarotistCarouselPortrait from "./tarotist-carousel-portrait";

const CARD_ASPECT = 300 / 527;

interface UpperViewerProps {
  claraMode?: boolean;
  /** claraMode と同様に占い師肖像を固定表示する。名前を指定すると /tarotists/{name}.png を使用 */
  profileTarotistName?: string;
  spread: Spread;
}

// メインコンポーネント
const UpperViewer: React.FC<UpperViewerProps> = ({ claraMode = false, profileTarotistName, spread }) => {
  const offlineName = profileTarotistName ?? (claraMode ? "Clara" : null);
  const { masterData } = useMaster();
  const {
    drawnCards,
    isRevealingCompleted,
    setIsRevealingCompleted,
  } = useSalon();

  const { upperViewerMode, setUpperViewerMode } = useSalon();
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [selectedCard, setSelectedCard] = useState<DrawnCard | null>(null);

  const dialogCardWidth = 240;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  // カルーセルビュー内でのスワイプ操作制御用
  const [swipeOn, setSwipeOn] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    startIndex: 0,
    skipSnaps: false,
    dragFree: false,
    // カルーセルビュー表示中かつswipeOnがfalseの場合はスワイプを無効化
    watchDrag: () => {
      if (selectedIndex === 2 && !swipeOn) {
        return false; // カルーセルビュー内でのインタラクション中はUpperViewerのスワイプ無効
      }
      return true;
    },
  });

  const toggleFlip = (cardId: string): void => {
    setShowHint(false); // 🔥 カードタップでヒントを消す
    const newFlipped = new Set(flippedCards);
    // あったらそのままにする仕様に変更
    if (!newFlipped.has(cardId)) {
      newFlipped.add(cardId);
    }
    setFlippedCards(newFlipped);
  };

  useEffect(() => {
    setUpperViewerMode("grid");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // isRevealingCompleteが、親により、trueになったら、全カードを裏返す
  useEffect(() => {
    if (isRevealingCompleted) {
      const allCardIds = drawnCards.map((card) => card.id);
      setFlippedCards(new Set(allCardIds));
    }
  }, [isRevealingCompleted, drawnCards]);

  // カードが全部捲られたら後、ダイアログが閉じられたら isRevealingComplete を true にする
  useEffect(() => {
    if (
      flippedCards.size > 0 &&
      flippedCards.size === drawnCards.length &&
      !selectedCard &&
      setIsRevealingCompleted
    ) {
      setTimeout(() => {
        console.log(
          "全てのカードが捲られました。isRevealingComplete を true に設定します。"
        );
        setIsRevealingCompleted(true);
      }, 1000);
    }
  }, [flippedCards, drawnCards.length, setIsRevealingCompleted, selectedCard]);

  const handleCardClick = (card: DrawnCard): void => {
    setSelectedCard(card);
  };

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    const modes = ["profile", "grid", "carousel"] as const;
    setUpperViewerMode(modes[index]);
  }, [emblaApi, setUpperViewerMode]);

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
    const modes = ["profile", "grid", "carousel"];
    const targetIndex = modes.indexOf(upperViewerMode);
    if (targetIndex !== -1 && selectedIndex !== targetIndex) {
      emblaApi.scrollTo(targetIndex);
    }
  }, [upperViewerMode, emblaApi, selectedIndex]);

  // カルーセルビューから離れた時はswipeOnをリセット
  useEffect(() => {
    if (selectedIndex !== 2) {
      setSwipeOn(false);
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (upperViewerMode === "carousel" && scrollContainerRef.current) {
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
  }, [currentIndex, upperViewerMode]);

  // 🔥 ヒントを5秒後に自動で消す
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-full bg-white flex flex-col pt-1">
      {/* Embla Carousel */}
      <div className="embla relative flex-1 min-h-0 overflow-hidden" ref={emblaRef}>
        <div className="embla__container flex h-full">
          {/* スライド1: プロフィール */}
          <div className="embla__slide flex-[0_0_100%] min-w-0 h-full">
            {/* 🔥 このスライド内でスクロール */}
            <div className="w-full h-full overflow-y-auto px-1 pb-4 backdrop-blur-md rounded-2xl sm:p-4 border border-white/10 shadow-xs">
              {selectedIndex === 0 && (
                offlineName ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src={`/tarotists/${offlineName}.png`}
                      alt={offlineName}
                      className="w-full h-full object-cover rounded-2xl"
                      style={{ objectPosition: "center 20%" }}
                    />
                  </div>
                ) : (
                  <TarotistCarouselPortrait
                    masterData={masterData}
                    readonly={true}
                  />
                )
              )}
            </div>
          </div>

          {/* スライド2: グリッド */}
          <div className="embla__slide flex-[0_0_100%] min-w-0 h-full">
            {/* 🔥 このスライド内でスクロール */}
            <div className="w-full h-full overflow-y-auto px-1 pb-4 backdrop-blur-md rounded-2xl sm:p-4 border border-white/10 shadow-xs">
              {selectedIndex === 1 && (
                <GridView
                  spread={spread}
                  drawnCards={drawnCards}
                  flippedCards={flippedCards}
                  onCardClick={handleCardClick}
                  onToggleFlip={toggleFlip}
                />
              )}
            </div>
          </div>

          {/* スライド3: カルーセル */}
          <div className="embla__slide flex-[0_0_100%] min-w-0 h-full">
            {/* 🔥 このスライド内でスクロール */}
            <div className="w-full h-full overflow-y-auto px-1 pb-4 backdrop-blur-md rounded-2xl sm:p-4 border border-white/10 shadow-xs">
              {selectedIndex === 2 && (
                <CarouselView
                  drawnCards={drawnCards}
                  currentIndex={currentIndex}
                  flippedCards={flippedCards}
                  scrollContainerRef={scrollContainerRef}
                  setSwipeOn={setSwipeOn}
                  onIndexChange={setCurrentIndex}
                  onCardClick={handleCardClick}
                  onToggleFlip={toggleFlip}
                />
              )}
            </div>
          </div>
        </div>

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
      </div>

      {/* ビューモード切替ボタン */}
      <div className="w-full flex justify-center gap-3 p-1 bg-white">
        {(["profile", "grid", "carousel"] as const).map((mode, index) => (
          <button
            key={mode}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`w-24 h-4 text-xs rounded-full transition-all ${
              selectedIndex === index ? "bg-purple-400/70" : "bg-purple-200/40"
            }`}
          >
            {mode === "profile"
              ? "占い師表示"
              : mode === "grid"
              ? "スプレッド表示"
              : "個別カード表示"}
          </button>
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

export default UpperViewer;
