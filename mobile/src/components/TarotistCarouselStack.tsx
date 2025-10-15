import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { useState } from "react";
import type { Tarotist } from "../../../shared/lib/types";

interface TarotistCarouselStackProps {
  availableTarotists: Tarotist[];
  currentPlan: string;
  canUseTarotist: (planCode: string) => boolean;
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

const TarotistCarouselStack: React.FC<TarotistCarouselStackProps> = ({
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<"left" | "right">("right");

  if (availableTarotists.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        占い師が見つかりません
      </div>
    );
  }

  const handleNext = () => {
    setExitDirection("right");
    setCurrentIndex((prev) => (prev + 1) % availableTarotists.length);
  };

  const handlePrev = () => {
    setExitDirection("left");
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
          const isVisible = Math.abs(offset) <= 2;

          if (!isVisible) return null;

          return (
            <CardWithDrag
              key={`${tarotist.name}-${index}`}
              tarotist={tarotist}
              offset={offset}
              isActive={isActive}
              isAvailable={canUseTarotist(tarotist.plan?.code || "GUEST")}
              getTarotistColor={getTarotistColor}
              renderStars={renderStars}
              onChangePlan={onChangePlan}
              isChangingPlan={isChangingPlan}
              onSwipeLeft={handleNext}
              onSwipeRight={handlePrev}
              onSelect={() => {
                if (
                  canUseTarotist(tarotist.plan?.code || "GUEST") &&
                  onSelectTarotist
                ) {
                  onSelectTarotist(tarotist);
                }
              }}
              exitDirection={exitDirection}
            />
          );
        })}
      </div>

      {/* カウンター */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
          <span className="font-bold text-purple-600">
            {currentIndex + 1} / {availableTarotists.length}
          </span>
        </div>
      </div>

      {/* スワイプヒント */}
      <motion.div
        className="absolute top-4 left-0 right-0 text-center pointer-events-none"
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 0, y: -10 }}
        transition={{ delay: 2.5, duration: 1 }}
      >
        <div className="inline-block bg-purple-500 text-white px-4 py-2 rounded-full text-xs md:text-sm shadow-lg">
          ← スワイプして選択 →
        </div>
      </motion.div>
    </div>
  );
};

// 個別カードコンポーネント
const CardWithDrag: React.FC<{
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
  onChangePlan: (planCode: string) => void;
  isChangingPlan: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSelect: () => void;
  exitDirection: "left" | "right";
}> = ({
  tarotist,
  offset,
  isActive,
  isAvailable,
  getTarotistColor,
  renderStars,
  onChangePlan,
  isChangingPlan,
  onSwipeLeft,
  onSwipeRight,
  onSelect,
  exitDirection,
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const opacity = useTransform(
    x,
    [-200, -150, 0, 150, 200],
    [0.5, 1, 1, 1, 0.5]
  );

  const colors = getTarotistColor(tarotist);

  const handleDragEnd = (event: MouseEvent | TouchEvent, info: PanInfo) => {
    const threshold = 80;

    if (info.offset.x > threshold) {
      onSwipeRight();
    } else if (info.offset.x < -threshold) {
      onSwipeLeft();
    }
  };

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        cursor: isActive ? "grab" : "default",
        x: isActive ? x : 0,
        rotate: isActive ? rotate : 0,
        opacity: isActive ? opacity : undefined,
        zIndex: 100 - Math.abs(offset) * 10,
      }}
      drag={isActive ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={false}
      animate={{
        scale: 1 - Math.abs(offset) * 0.05,
        y: Math.abs(offset) * 20,
        opacity: isActive
          ? isAvailable
            ? 1
            : 0.6
          : 0.85 - Math.abs(offset) * 0.15,
        filter: isAvailable
          ? `grayscale(0%) blur(${Math.abs(offset) * 2}px)`
          : `grayscale(100%) blur(${Math.abs(offset) * 2}px)`,
        rotateY: offset * 3,
      }}
      exit={{
        x: exitDirection === "right" ? 400 : -400,
        opacity: 0,
        rotate: exitDirection === "right" ? 25 : -25,
        transition: { duration: 0.4 },
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
      onClick={isActive ? onSelect : undefined}
    >
      {/* カード本体 */}
      <div
        className="w-full h-full rounded-2xl overflow-hidden shadow-2xl"
        style={{
          backgroundColor: colors.bg,
          borderWidth: "3px",
          borderStyle: "solid",
          borderColor: colors.secondary,
          transformStyle: "preserve-3d",
        }}
      >
        {/* 画像エリア */}
        <div className="relative h-72 md:h-80 overflow-hidden">
          <img
            src={`/tarotists/${tarotist.name}.png`}
            alt={tarotist.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='40'%3E🔮%3C/text%3E%3C/svg%3E";
            }}
          />

          {/* グラデーション */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

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
                  {tarotist.plan?.name}プラン
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
          {isActive && (
            <motion.div
              className="absolute top-4 left-4 flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
            >
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                ●
              </motion.span>
              NOW
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
                  fontFamily: "'Brush Script MT', cursive",
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
                onChangePlan(tarotist.plan?.code || "GUEST");
              }}
              disabled={isChangingPlan}
              className="w-full py-2.5 rounded-lg text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
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

          {/* 利用可能表示 */}
          {isAvailable && tarotist.provider !== "OFFLINE" && (
            <div className="text-center text-xs text-green-600 font-bold py-2 bg-green-50 rounded-lg">
              ✓ 利用可能 - タップして選択
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TarotistCarouselStack;
