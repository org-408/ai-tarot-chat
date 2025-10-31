import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MasterData, Plan, Tarotist } from "../../../shared/lib/types";
import { useSalonStore } from "../lib/stores/salon";
import {
  canUseTarotist,
  getTarotistColor,
  renderStars,
} from "../lib/utils/salon";
import type { UserPlan } from "../types";

interface TarotistCarouselPortraitProps {
  masterData: MasterData;
  currentPlan: Plan;
  onChangePlan?: (planCode: UserPlan) => void;
  isChangingPlan?: boolean;
  onClickTarotist?: (tarotist: Tarotist) => void;
  readonly?: boolean;
}

const TarotistCarouselPortrait: React.FC<TarotistCarouselPortraitProps> = ({
  masterData,
  currentPlan,
  onChangePlan,
  isChangingPlan,
  onClickTarotist,
  readonly = false,
}) => {
  const {
    selectedTarotist,
    setSelectedTarotist,
    selectedTargetMode,
    setSelectedTargetMode,
  } = useSalonStore();

  // 占い師の取得とフィルタリング
  const availableTarotists = useMemo(() => {
    if (!masterData.tarotists || !currentPlan) return [];

    return masterData.tarotists.filter((tarotist: Tarotist) => {
      // 全員見せるように変更
      return !!tarotist;
    });
  }, [masterData, currentPlan]);

  useEffect(() => {
    console.log(
      "[TarotistPortrait] availableTarotists or selectedTarotist changed",
      availableTarotists,
      selectedTarotist
    );
    if (availableTarotists.length > 0 && !selectedTarotist) {
      setSelectedTarotist(selectedTarotist || availableTarotists[0]);
    }
  }, [availableTarotists, selectedTarotist, setSelectedTarotist]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    skipSnaps: false,
    dragFree: false,
  });

  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    console.log("[TarotistPortrait] onSelect called");
    const index = emblaApi.selectedScrollSnap();
    // スクロール時に対応する占い師も選択状態にする
    setSelectedTarotist(availableTarotists[index]);
  }, [emblaApi, availableTarotists, setSelectedTarotist]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);

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

  const handleSelectTarotist = (tarotist: Tarotist) => {
    setSelectedTarotist(tarotist);
    setSelectedTargetMode("portrait");
  };

  // selectModeが変わった時に現在の占い師位置にスクロール
  useEffect(() => {
    if (!emblaApi || !selectedTarotist) return;
    console.log(
      "[TarotistPortrait] selectedTargetMode or selectedTarotist changed",
      selectedTargetMode,
      selectedTarotist
    );

    const selectedIndex = availableTarotists.findIndex(
      (t) => t.no === selectedTarotist.no
    );
    const currentIndex = emblaApi?.selectedScrollSnap();

    console.log(
      "[TarotistPortrait] Scrolling to selectedIndex",
      selectedIndex,
      currentIndex
    );
    if (selectedIndex !== currentIndex) {
      emblaApi.scrollTo(selectedIndex, true); // ← jump=trueで即座に切り替え
    }
  }, [availableTarotists, emblaApi, selectedTargetMode, selectedTarotist]);

  if (availableTarotists.length === 0) {
    return (
      <div className="text-center text-gray-500">占い師が見つかりません</div>
    );
  }

  // プラン変更処理
  const handleChangePlan = (requiredPlan: UserPlan, tarotist: Tarotist) => {
    try {
      if (onChangePlan) {
        onChangePlan(requiredPlan);
        // プラン変更後に選択占い師を設定
        handleSelectTarotist(tarotist);
      }
    } catch (error) {
      console.error("プラン変更中にエラーが発生しました:", error);
    }
  };

  // チャットモード - 肖像画表示
  if (selectedTargetMode !== "tarotist" && selectedTarotist) {
    const colors = getTarotistColor(selectedTarotist);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full h-full p-2 z-10"
        onClick={() => {
          if (onClickTarotist) onClickTarotist(selectedTarotist);
        }}
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
          {/* <div
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
          /> */}

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
              <h2
                className="text-xl font-bold drop-shadow-lg"
                style={{
                  color: colors.accent,
                  textShadow:
                    "2px 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)",
                }}
              >
                ({selectedTarotist.name})
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
          {!readonly && (
            <button
              onClick={() => setSelectedTargetMode("tarotist")}
              className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/20 hover:bg-white/50 transition-all shadow-md"
            >
              占い師を変更
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // 選択モード - 全画面カルーセル
  return (
    <div
      className="relative w-full flex flex-col overflow-hidden"
      style={{ height: "100%" }}
    >
      {/* スワイプヒント */}
      <motion.div
        className="text-center py-4"
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        <span
          className="text-gray-800 bg-white/70
            backdrop-blur-sm px-4 py-2 rounded-full shadow-md"
        >
          ← 占い師を選んでください →
        </span>
      </motion.div>

      {/* メインカルーセル */}
      <div className="flex-1 overflow-hidden min-h-0" ref={emblaRef}>
        <div className="flex h-full touch-pan-y">
          {availableTarotists.map((tarotist, index) => {
            const isAvailable = canUseTarotist(tarotist.plan!, currentPlan);
            const currentIndex = selectedTarotist
              ? availableTarotists.findIndex(
                  (t) => t.no === selectedTarotist.no
                )
              : 0;
            const isActive = index === currentIndex;
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
                  className="h-full flex items-center justify-center"
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
                        {/* <div
                          className="absolute inset-x-0 bottom-0 h-28"
                          style={{
                            background: `linear-gradient(to top, ${colors.bg}, transparent)`,
                          }}
                        /> */}

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
                            <h3
                              className="text-base font-bold drop-shadow-lg"
                              style={{
                                color: colors.accent,
                                textShadow:
                                  "2px 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)",
                              }}
                            >
                              ({tarotist.name})
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
                                onClick={() => handleSelectTarotist(tarotist)}
                                className="w-full py-2 rounded-xl text-white font-bold text-base shadow-lg"
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
                                  handleChangePlan(
                                    tarotist.plan!.code as UserPlan,
                                    tarotist
                                  );
                                }}
                                disabled={isChangingPlan}
                                className="w-full py-2 rounded-xl text-white font-bold text-base shadow-lg disabled:opacity-50"
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
      <div className="flex items-center justify-center gap-2 pt-6">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            className={`h-4 mx-2 rounded-full transition-all ${
              index === emblaApi?.selectedScrollSnap()
                ? "w-8 h-6 bg-purple-500"
                : "w-4 bg-gray-300"
            }`}
            onClick={() => scrollTo(index)}
            aria-label={`占い師 ${index + 1} を表示`}
          />
        ))}
      </div>
    </div>
  );
};

export default TarotistCarouselPortrait;
