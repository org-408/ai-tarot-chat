"use client";

import { motion } from "framer-motion";

const CARDS = [
  "17_star",
  "2_high_priestess",
  "0_fool",
  "18_moon",
  "21_world",
] as const;

const CENTER = 2;

export function HeroCards() {
  return (
    <div className="mt-16 flex justify-center items-end gap-4 sm:gap-6 relative">
      {/* 光のグロー */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-12 bg-purple-400/30 blur-2xl rounded-full pointer-events-none"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {CARDS.map((card, i) => {
        const rotation = (i - CENTER) * 7;
        const baseY = Math.abs(i - CENTER) * 6;
        const isCenter = i === CENTER;

        return (
          <div
            key={i}
            style={{ transform: `rotate(${rotation}deg)` }}
            className={isCenter ? "z-10" : ""}
          >
            <motion.div
              className="relative w-16 h-24 sm:w-20 sm:h-32 rounded-xl overflow-hidden shadow-xl"
              style={{ translateY: baseY }}
              animate={{ y: [0, isCenter ? -8 : i % 2 === 0 ? -5 : -10, 0] }}
              transition={{
                duration: isCenter ? 3 : 2.5 + i * 0.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.25,
              }}
            >
              {/* カード枠 */}
              <div
                className={`absolute inset-0 rounded-xl border pointer-events-none z-10 ${
                  isCenter
                    ? "border-purple-300/60 shadow-lg shadow-purple-500/30"
                    : "border-purple-400/30"
                }`}
              />

              {isCenter ? (
                /* 中央カード：表裏フリップ */
                <motion.div
                  style={{
                    transformStyle: "preserve-3d",
                    width: "100%",
                    height: "100%",
                    position: "relative",
                  }}
                  animate={{ rotateY: [0, 180, 360] }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    repeatDelay: 1.5,
                  }}
                >
                  {/* 表面 */}
                  <div
                    style={{ backfaceVisibility: "hidden" }}
                    className="absolute inset-0"
                  >
                    <img
                      src={`/cards/${card}.png`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* 裏面 */}
                  <div
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                    className="absolute inset-0"
                  >
                    <img
                      src="/cards/back.png"
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                </motion.div>
              ) : (
                /* サイドカード：画像のみ */
                <img
                  src={`/cards/${card}.png`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
