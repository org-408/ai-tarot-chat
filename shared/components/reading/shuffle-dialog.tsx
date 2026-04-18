import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { CARD_ASPECT } from "../../lib/constants";

interface ShuffleDialogProps {
  isOpen: boolean;
  onComplete: () => void;
  /** シャッフルするカード枚数。デフォルト: 78 */
  cardCount?: number;
  /** 最大サイクル数。デフォルト: 10 */
  maxCycles?: number;
  /** カード裏面画像パス。デフォルト: "/cards/back.png" */
  cardBackPath?: string;
}

/**
 * カードシャッフルアニメーションダイアログ。
 * isOpen=true でシャッフルアニメーションを開始。
 * maxCycles 完了または isOpen=false になると onComplete を呼ぶ。
 * プラットフォーム非依存。
 */
export const ShuffleDialog: React.FC<ShuffleDialogProps> = ({
  isOpen,
  onComplete,
  cardCount = 78,
  maxCycles = 10,
  cardBackPath = "/cards/back.png",
}) => {
  const [phase, setPhase] = useState<"shuffle" | "gather">("shuffle");
  const [internalOpen, setInternalOpen] = useState(false);
  const cycleCountRef = useRef(0);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen && !internalOpen) {
      setInternalOpen(true);
      cycleCountRef.current = 0;
      setPhase("shuffle");
    }
  }, [isOpen, internalOpen]);

  const handleAnimationComplete = () => {
    if (phase === "shuffle") {
      setPhase("gather");
    } else {
      cycleCountRef.current += 1;
      if (!isOpenRef.current || cycleCountRef.current >= maxCycles) {
        setInternalOpen(false);
        setTimeout(() => onComplete(), 300);
        return;
      }
      setPhase("shuffle");
    }
  };

  const getRandomPosition = () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 200;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rotate: -180 + Math.random() * 360,
      scale: 0.7 + Math.random() * 0.3,
    };
  };

  const handleDialogClick = () => {
    if (!isOpenRef.current && internalOpen) {
      setInternalOpen(false);
      setTimeout(() => onComplete(), 300);
    }
  };

  return (
    <AnimatePresence>
      {internalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDialogClick}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* テキスト */}
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.8 }}
              animate={{
                opacity: 1,
                y: [0, -10, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{
                opacity: { duration: 0.5 },
                y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              }}
              className="absolute top-1/4 z-10 text-white text-2xl font-bold tracking-widest drop-shadow-[0_0_15px_rgba(147,51,234,0.8)] whitespace-nowrap"
              style={{
                textShadow:
                  "0 0 20px rgba(147,51,234,0.8), 0 0 40px rgba(147,51,234,0.5), 0 4px 8px rgba(0,0,0,0.5)",
              }}
            >
              {phase === "shuffle"
                ? "カードをシャッフル中..."
                : "運命を読み取っています..."}
            </motion.div>

            {/* カードの山 */}
            <div
              className="relative"
              style={{ width: "180px", height: `${Math.round(180 / CARD_ASPECT)}px` }}
            >
              {Array.from({ length: cardCount }).map((_, index) => {
                const randomPos = getRandomPosition();
                const delay = index * 0.008;
                const isLastCard = index === cardCount - 1;

                return (
                  <motion.div
                    key={index}
                    className="absolute inset-0 w-full h-full"
                    animate={
                      phase === "shuffle"
                        ? {
                            x: randomPos.x,
                            y: randomPos.y,
                            rotate: randomPos.rotate,
                            scale: randomPos.scale,
                          }
                        : {
                            x: 0,
                            y: 0,
                            rotate: (index - cardCount / 2) * 0.3,
                            scale: 1,
                          }
                    }
                    transition={{
                      duration: 2.5,
                      delay,
                      ease: phase === "shuffle" ? "easeOut" : "easeInOut",
                    }}
                    onAnimationComplete={
                      isLastCard ? handleAnimationComplete : undefined
                    }
                    style={{
                      zIndex: phase === "gather" ? cardCount - index : index,
                    }}
                  >
                    <div
                      className="w-full h-full rounded-lg shadow-2xl overflow-hidden border-2 border-purple-300/30"
                      style={{ aspectRatio: `${CARD_ASPECT}` }}
                    >
                      <img
                        src={cardBackPath}
                        alt="Tarot card back"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
