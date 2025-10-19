import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface ShuffleDialogProps {
  isOpen: boolean;
  onComplete: () => void;
  cardCount?: number;
  maxCycles?: number;
}

const ShuffleDialog: React.FC<ShuffleDialogProps> = ({
  isOpen,
  onComplete,
  cardCount = 78,
  maxCycles = 10,
}) => {
  const [phase, setPhase] = useState<"shuffle" | "gather">("shuffle");
  const [internalOpen, setInternalOpen] = useState(false);
  const cycleCountRef = useRef(0);
  const isOpenRef = useRef(isOpen);

  // isOpenの最新値を保持
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen && !internalOpen) {
      // 開始
      setInternalOpen(true);
      cycleCountRef.current = 0;
      setPhase("shuffle");
    }
  }, [isOpen, internalOpen]);

  const handleAnimationComplete = () => {
    console.log("アニメーション完了", {
      phase,
      cycleCount: cycleCountRef.current,
      isOpenRef: isOpenRef.current,
    });

    if (phase === "shuffle") {
      // shuffle完了 → gatherへ
      setPhase("gather");
    } else {
      // gather完了 → 1サイクル完了
      cycleCountRef.current += 1;

      // 終了条件チェック: isOpenがfalse OR 最大サイクル到達
      if (!isOpenRef.current || cycleCountRef.current >= maxCycles) {
        console.log("終了");
        setInternalOpen(false);
        setTimeout(() => onComplete(), 300);
        return;
      }

      // 継続: 次のshuffleへ
      setPhase("shuffle");
    }
  };

  const getRandomPosition = () => {
    // よりランダムで自然なシャッフル
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 200;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rotate: -180 + Math.random() * 360,
      scale: 0.7 + Math.random() * 0.3,
    };
  };

  // 画面タップ時のハンドラ
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
            {/* シャッフルテキスト - 浮遊アニメーション付き */}
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.8 }}
              animate={{
                opacity: 1,
                y: [0, -10, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{
                opacity: { duration: 0.5 },
                y: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                scale: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
              className="absolute top-1/4 z-1000 text-white text-2xl font-bold tracking-widest drop-shadow-[0_0_15px_rgba(147,51,234,0.8)] whitespace-nowrap"
              style={{
                textShadow:
                  "0 0 20px rgba(147,51,234,0.8), 0 0 40px rgba(147,51,234,0.5), 0 4px 8px rgba(0,0,0,0.5)",
              }}
            >
              {phase === "shuffle"
                ? "カードをシャッフル中..."
                : "運命を読み取っています..."}
            </motion.div>

            {/* カードの山 - アスペクト比 300:527 */}
            <div
              className="relative"
              style={{ width: "180px", height: "316px" }}
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
                      delay: delay,
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
                      style={{ aspectRatio: "300/527" }}
                    >
                      <img
                        src="/cards/back.png"
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

export default ShuffleDialog;
