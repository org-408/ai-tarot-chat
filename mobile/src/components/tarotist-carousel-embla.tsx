import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import type { Plan, Tarotist } from "../../../shared/lib/types";
import type { UserPlan } from "../types";

interface TarotistCarouselEmblaProps {
  availableTarotists: Tarotist[];
  currentPlan: Plan;
  canUseTarotist: (planCode: string) => boolean;
  getTarotistColor: (tarotist: Tarotist) => {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    button: string;
  };
  renderStars: (quality: number) => string;
  onChangePlan: (planCode: UserPlan) => void;
  isChangingPlan: boolean;
  onSelectTarotist?: (tarotist: Tarotist) => void;
}

const TarotistCarouselEmbla: React.FC<TarotistCarouselEmblaProps> = ({
  availableTarotists,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentPlan,
  canUseTarotist,
  getTarotistColor,
  renderStars,
  onChangePlan,
  isChangingPlan,
  onSelectTarotist,
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    skipSnaps: false,
    dragFree: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (availableTarotists.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        占い師が見つかりません
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[420px] mx-auto px-4">
      {/* メインカルーセル */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {availableTarotists.map((tarotist, index) => {
            const isAvailable = canUseTarotist(tarotist.plan?.code || "GUEST");
            const isActive = index === selectedIndex;
            const colors = getTarotistColor(tarotist);

            return (
              <div
                key={tarotist.name}
                className="flex-[0_0_100%] min-w-0 px-2"
              >
                <motion.div
                  animate={{
                    scale: isActive ? 1 : 0.92,
                    opacity: isAvailable ? 1 : 0.5,
                    filter: isAvailable
                      ? "grayscale(0%) blur(0px)"
                      : "grayscale(100%) blur(1px)",
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative h-full"
                  onClick={() => {
                    if (isAvailable && onSelectTarotist) {
                      onSelectTarotist(tarotist);
                    }
                  }}
                >
                  {/* カード本体 */}
                  <div
                    className="rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
                    style={{
                      backgroundColor: colors.bg,
                      borderWidth: "2px",
                      borderStyle: "solid",
                      borderColor: colors.secondary,
                    }}
                  >
                    {/* 画像エリア */}
                    <div className="relative h-64 md:h-80 overflow-hidden">
                      <img
                        src={`/tarotists/${tarotist.name}.png`}
                        alt={tarotist.title}
                        className="w-full h-full object-cover object-center"
                        onError={(e) => {
                          e.currentTarget.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='40'%3E🔮%3C/text%3E%3C/svg%3E";
                        }}
                      />

                      {/* グラデーション */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* ロックオーバーレイ */}
                      {!isAvailable && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                              delay: 0.2,
                              type: "spring",
                              stiffness: 200,
                            }}
                            className="text-center"
                          >
                            <div className="text-6xl mb-2">🔒</div>
                            <div className="text-white text-sm font-bold bg-black/50 px-3 py-1 rounded-full">
                              {tarotist.plan?.name}プラン
                            </div>
                          </motion.div>
                        </div>
                      )}

                      {/* プランバッジ */}
                      <div
                        className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg"
                        style={{
                          backgroundColor:
                            tarotist.plan?.accentColor || colors.accent,
                        }}
                      >
                        {tarotist.plan?.name || "GUEST"}
                      </div>

                      {/* アクティブインジケーター */}
                      {isActive && (
                        <motion.div
                          className="absolute top-3 left-3 w-3 h-3 bg-green-400 rounded-full shadow-lg"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        />
                      )}
                    </div>

                    {/* 情報エリア */}
                    <div className="p-5 md:p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl md:text-4xl">
                          {tarotist.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-xl md:text-2xl font-bold truncate"
                            style={{
                              fontFamily: "'MonteCarlo', cursive",
                              color: colors.accent,
                            }}
                          >
                            {tarotist.name}
                          </h3>
                          <p className="text-xs md:text-sm text-gray-600 truncate">
                            {tarotist.title}
                          </p>
                        </div>
                      </div>

                      <p
                        className="text-sm font-semibold mb-2"
                        style={{ color: colors.accent }}
                      >
                        {tarotist.trait}
                      </p>

                      <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                        {tarotist.bio}
                      </p>

                      {/* おすすめ度 */}
                      {tarotist.provider !== "OFFLINE" && (
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs text-gray-600">
                            おすすめ度:
                          </span>
                          <span className="text-base">
                            {renderStars(tarotist.quality || 0)}
                          </span>
                        </div>
                      )}

                      {/* アップグレードボタン */}
                      {!isAvailable && tarotist.provider !== "OFFLINE" && (
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            onChangePlan(
                              (tarotist.plan?.code as UserPlan) || "GUEST"
                            );
                          }}
                          disabled={isChangingPlan}
                          className="w-full py-2.5 rounded-lg text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
                          style={{
                            backgroundColor:
                              tarotist.plan?.accentColor || colors.accent,
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {isChangingPlan
                            ? "認証中..."
                            : `${tarotist.plan?.name}にアップグレード`}
                        </motion.button>
                      )}

                      {/* 利用可能表示 */}
                      {isAvailable && tarotist.provider !== "OFFLINE" && (
                        <div className="text-center text-xs text-green-600 font-bold py-2">
                          ✓ 利用可能
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ドットインジケーター */}
      <div className="flex justify-center gap-2 mt-4 mb-2">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            className={`h-2 rounded-full transition-all ${
              index === selectedIndex ? "w-8 bg-purple-500" : "w-2 bg-gray-300"
            }`}
            onClick={() => scrollTo(index)}
            aria-label={`占い師 ${index + 1} を表示`}
          />
        ))}
      </div>

      {/* 左右ナビゲーションボタン */}
      <button
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 md:p-3 rounded-full shadow-lg z-10 transition-all"
        onClick={scrollPrev}
        aria-label="前の占い師"
      >
        <svg
          className="w-5 h-5 md:w-6 md:h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <button
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 md:p-3 rounded-full shadow-lg z-10 transition-all"
        onClick={scrollNext}
        aria-label="次の占い師"
      >
        <svg
          className="w-5 h-5 md:w-6 md:h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* スワイプヒント（初回のみ） */}
      <motion.div
        className="text-center mt-2"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 3, duration: 1 }}
      >
        <span className="text-xs text-gray-400">← スワイプして選択 →</span>
      </motion.div>
    </div>
  );
};

export default TarotistCarouselEmbla;
