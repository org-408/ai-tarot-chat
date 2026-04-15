"use client";

import { motion } from "framer-motion";

export function CTACards() {
  return (
    <div className="flex justify-center items-end gap-3 mb-8">
      {/* 左カード（裏面・傾き） */}
      <motion.div
        className="w-14 h-[88px] rounded-xl overflow-hidden border border-purple-400/40 shadow-lg"
        style={{ rotate: -8 }}
        animate={{ y: [4, -2, 4] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <img src="/cards/back.png" alt="" className="w-full h-full object-cover" />
      </motion.div>

      {/* 中央カード（表裏フリップ） */}
      <motion.div
        className="w-16 h-24 rounded-xl overflow-hidden border border-purple-300/60 shadow-xl z-10"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
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
            repeatDelay: 2,
          }}
        >
          <div style={{ backfaceVisibility: "hidden" }} className="absolute inset-0">
            <img src="/cards/0_fool.png" alt="" className="w-full h-full object-cover" />
          </div>
          <div
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            className="absolute inset-0"
          >
            <img src="/cards/back.png" alt="" className="w-full h-full object-cover" />
          </div>
        </motion.div>
      </motion.div>

      {/* 右カード（裏面・傾き） */}
      <motion.div
        className="w-14 h-[88px] rounded-xl overflow-hidden border border-purple-400/40 shadow-lg"
        style={{ rotate: 8 }}
        animate={{ y: [4, -4, 4] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <img src="/cards/back.png" alt="" className="w-full h-full object-cover" />
      </motion.div>
    </div>
  );
}
