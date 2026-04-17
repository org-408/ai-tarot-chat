import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { useState } from "react";
import type { Plan, Tarotist } from "../../../shared/lib/types";
import type { UserPlan } from "../types";

interface TarotistCarouselStackProps {
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

const TarotistCarouselStack: React.FC<TarotistCarouselStackProps> = ({
  availableTarotists,
  canUseTarotist,
  getTarotistColor,
  renderStars,
  onChangePlan,
  isChangingPlan,
  onSelectTarotist,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (availableTarotists.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        占い師が見つかりません
      </div>
    );
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % availableTarotists.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? availableTarotists.length - 1 : prev - 1
    );
  };

  return (
    <div className="relative w-full h-[550px] md:h-[600px] flex items-center justify-center px-4">
      {/* カードスタック */}
      <div className="relative w-full max-w-md h-full">
        {availableTarotists.map((tarotist, index) => {
          const offset = index - currentIndex;
          const isActive = offset === 0;
          const isVisible = Math.abs(offset) <= 3;

          if (!isVisible) return null;

          return (
            <TinderCard
              key={`${tarotist.name}-${index}`}
              tarotist={tarotist}
              offset={offset}
              isActive={isActive}
              isAvailable={canUseTarotist(tarotist.plan?.code || "GUEST")}
              getTarotistColor={getTarotistColor}
              renderStars={renderStars}
              onChangePlan={onChangePlan}
              isChangingPlan={isChangingPlan}
              onNext={handleNext}
              onPrev={handlePrev}
              onSelect={() => {
                if (
                  canUseTarotist(tarotist.plan?.code || "GUEST") &&
                  onSelectTarotist
                ) {
                  onSelectTarotist(tarotist);
                }
              }}
            />
          );
        })}
      </div>

      {/* 左右ナビゲーションボタン */}
      <button
        onClick={handlePrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-xl z-20 transition-all active:scale-95"
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
        onClick={handleNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-xl z-20 transition-all active:scale-95"
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

      {/* カウンター */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
          <span className="font-bold text-purple-600">
            {currentIndex + 1} / {availableTarotists.length}
          </span>
        </div>
      </div>

      {/* 操作ヒント */}
      <motion.div
        className="absolute top-4 left-0 right-0 text-center pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 3, duration: 1 }}
      >
        <div className="inline-block bg-purple-500 text-white px-4 py-2 rounded-full text-xs md:text-sm shadow-lg">
          スワイプで閲覧 / タップで選択
        </div>
      </motion.div>
    </div>
  );
};

// Tinder風カードコンポーネント
// Tinder風カードコンポーネント
const TinderCard: React.FC<{
  tarotist: Tarotist;
  offset: number;
  isActive: boolean;
  isAvailable: boolean;
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
  onNext: () => void;
  onPrev: () => void;
  onSelect: () => void;
}> = ({
  tarotist,
  offset,
  isActive,
  isAvailable,
  getTarotistColor,
  renderStars,
  onChangePlan,
  isChangingPlan,
  onNext,
  onPrev,
  onSelect,
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // ✅ Hooksは常にトップレベルで呼ぶ
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25]);
  const opacityLeft = useTransform(x, [-200, -100, 0], [1, 1, 0]);
  const opacityRight = useTransform(x, [0, 100, 200], [0, 1, 1]);

  const colors = getTarotistColor(tarotist);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    setIsDragging(false);

    const threshold = 100;
    const velocity = info.velocity.x;

    if (Math.abs(velocity) > 500 || Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > 0) {
        onPrev();
      } else {
        onNext();
      }
    }
  };

  return (
    <motion.div
      className="absolute inset-0 select-none"
      style={{
        x: isActive ? x : 0,
        y: isActive ? y : 0,
        rotate: isActive ? rotate : 0,
        zIndex: 100 - Math.abs(offset) * 10,
        cursor: isActive ? (isDragging ? "grabbing" : "grab") : "default",
      }}
      drag={isActive ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={1}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      animate={{
        scale: 1 - Math.abs(offset) * 0.05,
        y: Math.abs(offset) * 15,
        opacity: Math.max(0.3, 1 - Math.abs(offset) * 0.2),
        filter: isAvailable
          ? `grayscale(0%) blur(${Math.abs(offset) * 2}px)`
          : `grayscale(100%) blur(${Math.abs(offset) * 2}px)`,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
      onClick={() => {
        if (!isDragging && isActive) {
          onSelect();
        }
      }}
    >
      {/* カード本体 */}
      <div
        className="w-full h-full rounded-2xl overflow-hidden shadow-2xl"
        style={{
          backgroundColor: colors.bg,
          borderWidth: "4px",
          borderStyle: "solid",
          borderColor: isActive ? colors.accent : colors.secondary,
          transformStyle: "preserve-3d",
          transition: "border-color 0.3s",
        }}
      >
        {/* 画像エリア */}
        <div className="relative h-72 md:h-80 overflow-hidden">
          <img
            src={`/tarotists/${tarotist.name}.png`}
            alt={tarotist.title}
            className="w-full h-full object-cover"
            draggable={false}
            onError={(e) => {
              e.currentTarget.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='40'%3E🔮%3C/text%3E%3C/svg%3E";
            }}
          />

          {/* グラデーション */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* スワイプ方向インジケーター（左） ✅ isActiveで表示制御、Hookは外で呼ぶ */}
          {isActive && (
            <motion.div
              className="absolute left-8 top-1/2 -translate-y-1/2 bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xl rotate-[-20deg] pointer-events-none"
              style={{ opacity: opacityLeft }}
            >
              ← PREV
            </motion.div>
          )}

          {/* スワイプ方向インジケーター（右） ✅ 修正済み */}
          {isActive && (
            <motion.div
              className="absolute right-8 top-1/2 -translate-y-1/2 bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-xl rotate-[20deg] pointer-events-none"
              style={{ opacity: opacityRight }}
            >
              NEXT →
            </motion.div>
          )}

          {/* ロックオーバーレイ */}
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  delay: 0.1,
                }}
                className="text-center"
              >
                <div className="text-7xl mb-3">🔒</div>
                <div className="text-white text-sm font-bold bg-black/60 px-4 py-1.5 rounded-full">
                  {tarotist.plan?.name}プラン必要
                </div>
              </motion.div>
            </div>
          )}

          {/* プランバッジ */}
          <div
            className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg"
            style={{
              backgroundColor: tarotist.plan?.accentColor || colors.accent,
            }}
          >
            {tarotist.plan?.name || "GUEST"}
          </div>

          {/* アクティブインジケーター */}
          {isActive && !isDragging && (
            <motion.div
              className="absolute top-4 left-4 flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                ●
              </motion.span>
              FOCUS
            </motion.div>
          )}
        </div>

        {/* 情報エリア */}
        <div className="p-5 md:p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl md:text-4xl">{tarotist.icon}</span>
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
              <span className="text-xs text-gray-600">おすすめ度:</span>
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
                onChangePlan((tarotist.plan?.code as UserPlan) || "GUEST");
              }}
              disabled={isChangingPlan}
              className="w-full py-3 rounded-lg text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
              style={{
                backgroundColor: tarotist.plan?.accentColor || colors.accent,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isChangingPlan
                ? "認証中..."
                : `${tarotist.plan?.name}にアップグレード`}
            </motion.button>
          )}

          {/* 選択ボタン */}
          {isAvailable && tarotist.provider !== "OFFLINE" && isActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="text-xs text-gray-600 mb-2">
                👆 タップして占ってもらう
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-green-600 font-bold py-2 bg-green-50 rounded-lg">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                利用可能
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TarotistCarouselStack;
