import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import type { Plan, Tarotist } from "../../../shared/lib/types";

interface TarotistCarouselEmblaProps {
  availableTarotists: Tarotist[];
  currentPlan: Plan;
  getTarotistColor: (tarotist: Tarotist) => {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    button: string;
  };
  renderStars: (quality: number) => string;
  onChangePlan: (planCode: string) => void;
  isChangingPlan: boolean;
  onSelectTarotist?: (tarotist: Tarotist) => void;
}

const TarotistCarouselEmbla: React.FC<TarotistCarouselEmblaProps> = ({
  availableTarotists,
  currentPlan,
  getTarotistColor,
  renderStars,
  onChangePlan,
  isChangingPlan,
  onSelectTarotist,
}) => {
  const [mode, setMode] = useState<"selection" | "chat">("selection");
  const [selectedTarotist, setSelectedTarotist] = useState<Tarotist | null>(
    null
  );

  const canUseTarotist = (requiredPlan: Plan) => {
    return requiredPlan.no <= currentPlan.no;
  };

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

  const handleStartReading = (tarotist: Tarotist) => {
    setSelectedTarotist(tarotist);
    setMode("chat");
    if (onSelectTarotist) {
      onSelectTarotist(tarotist);
    }
  };

  if (availableTarotists.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        占い師が見つかりません
      </div>
    );
  }

  // チャットモード - 肖像画表示
  if (mode === "chat" && selectedTarotist) {
    const colors = getTarotistColor(selectedTarotist);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full h-[45vh] p-4"
      >
        <div className="h-full rounded-3xl overflow-hidden shadow-xl relative">
          {/* 肖像画 - 全面 */}
          <img
            src={`/tarotists/${selectedTarotist.name}.png`}
            alt={selectedTarotist.title}
            className="w-full h-full object-cover object-top"
            style={{
              objectPosition: "center 20%",
            }}
          />

          {/* 下部グラデーション - 占い師カラー + 黒で重ねがけ */}
          <div
            className="absolute inset-x-0 bottom-0 h-40"
            style={{
              background: `linear-gradient(to top, ${colors.primary}e6, transparent)`,
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-40"
            style={{
              background: `linear-gradient(to top, rgba(0,0,0,0.5), transparent)`,
            }}
          />

          {/* 名前と特徴 - 下部に浮かせて表示 */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl drop-shadow-lg">
                {selectedTarotist.icon}
              </span>
              <h2
                className="text-2xl font-bold drop-shadow-lg"
                style={{
                  fontFamily: "'Brush Script MT', cursive",
                  color: colors.accent,
                  textShadow:
                    "2px 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)",
                }}
              >
                {selectedTarotist.name}
              </h2>
            </div>
            <p
              className="text-base font-semibold"
              style={{
                color: colors.accent,
                textShadow:
                  "1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.5)",
              }}
            >
              {selectedTarotist.trait}
            </p>
          </div>

          {/* 占い師変更ボタン - 右下にひっそり配置 */}
          <button
            onClick={() => setMode("selection")}
            className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/70 hover:bg-white/90 transition-all shadow-md"
          >
            占い師を変更
          </button>
        </div>
      </motion.div>
    );
  }

  // 選択モード - 全画面カルーセル
  return (
    <div className="relative w-full h-screen flex flex-col">
      {/* メインカルーセル */}
      <div className="flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full touch-pan-y">
          {availableTarotists.map((tarotist, index) => {
            const isAvailable = canUseTarotist(tarotist.plan!);
            const isActive = index === selectedIndex;
            const colors = getTarotistColor(tarotist);

            return (
              <div
                key={tarotist.name}
                className="flex-[0_0_100%] min-w-0 px-6 h-full"
              >
                <motion.div
                  animate={{
                    scale: isActive ? 1 : 0.85,
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-full flex items-center justify-center py-8"
                >
                  {/* カード */}
                  <div
                    className="relative w-full max-w-lg h-full rounded-3xl overflow-hidden shadow-2xl"
                    style={{
                      backgroundColor: colors.bg,
                      borderWidth: "3px",
                      borderStyle: "solid",
                      borderColor: colors.secondary,
                    }}
                  >
                    {/* 背景グラデーション */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                      }}
                    />

                    {/* カード内容 */}
                    <div className="relative h-full flex flex-col">
                      {/* 画像部分 - 上部60% */}
                      <div className="relative flex-[6] overflow-hidden">
                        <motion.img
                          src={`/tarotists/${tarotist.name}.png`}
                          alt={tarotist.title}
                          className="w-full h-full object-cover object-top"
                          animate={{
                            opacity: isAvailable ? 1 : 0.3,
                            filter: isAvailable
                              ? "grayscale(0%) blur(0px)"
                              : "grayscale(80%) blur(0.5px)",
                          }}
                          transition={{ duration: 0.4 }}
                        />

                        {/* 下部グラデーション */}
                        <div
                          className="absolute inset-x-0 bottom-0 h-32"
                          style={{
                            background: `linear-gradient(to top, ${colors.bg}, transparent)`,
                          }}
                        />

                        {/* プランバッジ */}
                        <div
                          className="absolute top-4 right-4 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-lg"
                          style={{
                            backgroundColor:
                              tarotist.plan?.accentColor || colors.accent,
                          }}
                        >
                          {tarotist.provider !== "OFFLINE"
                            ? tarotist.plan?.name || "GUEST"
                            : "オフライン"}
                        </div>

                        {/* アクティブインジケーター */}
                        {isActive && (
                          <motion.div
                            className="absolute top-4 left-4 w-3 h-3 bg-green-400 rounded-full shadow-lg"
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                          />
                        )}
                      </div>

                      {/* 情報エリア - 下部40% */}
                      <div className="relative flex-[4] p-6 flex flex-col justify-between">
                        {/* 名前とタイトル */}
                        <div className="text-center mb-3">
                          <div className="flex items-center justify-center gap-3 mb-2">
                            <span className="text-4xl drop-shadow-lg">
                              {tarotist.icon}
                            </span>
                            <h3
                              className="text-3xl font-bold drop-shadow-lg"
                              style={{
                                fontFamily: "'Brush Script MT', cursive",
                                color: colors.accent,
                                textShadow:
                                  "2px 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)",
                              }}
                            >
                              {tarotist.name}
                            </h3>
                          </div>
                          <p
                            className="text-sm font-semibold"
                            style={{
                              color: colors.accent,
                              textShadow:
                                "1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.5)",
                            }}
                          >
                            {tarotist.title}
                          </p>
                        </div>

                        {/* 特徴 */}
                        <p
                          className="text-center text-base font-semibold mb-3"
                          style={{
                            color: colors.accent,
                            textShadow:
                              "1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.5)",
                          }}
                        >
                          {tarotist.trait}
                        </p>

                        {/* Bio - 全文表示 */}
                        <div
                          className="text-sm text-gray-700 text-center mb-3"
                          dangerouslySetInnerHTML={{
                            __html: tarotist.bio,
                          }}
                        ></div>

                        {/* おすすめ度 - OFFLINEでも表示 */}
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <span className="text-xs text-gray-600">
                            おすすめ度:
                          </span>
                          <span className="text-lg">
                            {renderStars(tarotist.quality || 0)}
                          </span>
                        </div>

                        {/* ボタン - OFFLINEの場合は表示しない */}
                        {tarotist.provider !== "OFFLINE" && (
                          <>
                            {isAvailable ? (
                              <motion.button
                                onClick={() => handleStartReading(tarotist)}
                                className="w-full py-3 rounded-lg text-white font-bold text-base shadow-lg"
                                style={{
                                  backgroundColor: colors.button,
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                占ってもらう
                              </motion.button>
                            ) : (
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onChangePlan(tarotist.plan?.code || "GUEST");
                                }}
                                disabled={isChangingPlan}
                                className="w-full py-3 rounded-lg text-white font-bold text-base shadow-lg disabled:opacity-50"
                                style={{
                                  backgroundColor:
                                    tarotist.plan?.accentColor || colors.button,
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                {isChangingPlan
                                  ? "認証中..."
                                  : `${tarotist.plan?.name}にアップグレード`}
                              </motion.button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 左右ナビゲーションボタン - カルーセルの真ん中 */}
      <button
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg z-10 transition-all"
        onClick={scrollPrev}
        aria-label="前の占い師"
      >
        <svg
          className="w-6 h-6"
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
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg z-10 transition-all"
        onClick={scrollNext}
        aria-label="次の占い師"
      >
        <svg
          className="w-6 h-6"
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

      {/* ドットインジケーター */}
      <div className="flex items-center justify-center gap-2 py-6">
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

      {/* スワイプヒント */}
      <motion.div
        className="text-center pb-4"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 3, duration: 1 }}
      >
        <span className="text-sm text-gray-400">← スワイプして選択 →</span>
      </motion.div>
    </div>
  );
};

export default TarotistCarouselEmbla;
