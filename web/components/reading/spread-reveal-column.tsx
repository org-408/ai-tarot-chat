"use client";

import { UpperViewer, type UpperViewerTab } from "@shared/components/tarot/upper-viewer";
import type { DrawnCard, Spread } from "@shared/lib/types";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface SpreadRevealColumnProps {
  spread: Spread;
  drawnCards: DrawnCard[];
  isRevealingCompleted: boolean;
  onRevealAll: () => void;
  /** めくり完了通知（個別めくりで全部開いた時にも発火）*/
  onRevealingCompleted?: () => void;
  revealAllLabel?: string;
  revealPromptLabel?: string;
  allRevealedLabel?: string;
}

/**
 * 右カラム。スプレッドを表示し、裏面 → ユーザーがめくる／一気にめくる体験を提供。
 * 最下部に「一気にめくる」ボタンを配置（めくり完了時は非表示）。
 */
export function SpreadRevealColumn({
  spread,
  drawnCards,
  isRevealingCompleted,
  onRevealAll,
  onRevealingCompleted,
  revealAllLabel = "✨ 一気にめくる ✨",
  revealPromptLabel = "全カードをめくって占い結果を確認しましょう！",
  allRevealedLabel = "すべてのカードが開きました",
}: SpreadRevealColumnProps) {
  const [upperTab, setUpperTab] = useState<UpperViewerTab>("grid");

  // めくり完了 → プロフィールタブに自動切替するのではなく grid を維持する
  useEffect(() => {
    if (isRevealingCompleted) setUpperTab("grid");
  }, [isRevealingCompleted]);

  return (
    <div className="flex flex-col h-full">
      {/* スプレッド本体 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <UpperViewer
          spread={spread}
          drawnCards={drawnCards}
          isRevealingCompleted={isRevealingCompleted}
          onRevealingCompleted={onRevealingCompleted}
          cardBasePath="/cards"
          activeTab={upperTab}
          onActiveTabChange={setUpperTab}
          flipCardWidth={80}
          flipCardHeight={140}
        />
      </div>

      {/* 最下部: 一気にめくるボタン（めくり未完了時のみ） */}
      {!isRevealingCompleted && drawnCards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 px-4 py-3 border-t border-purple-100 bg-white"
        >
          <motion.div
            className="text-center mb-2"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          >
            <p className="text-xs text-gray-600">{revealPromptLabel}</p>
          </motion.div>
          <button
            type="button"
            onClick={onRevealAll}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold shadow-lg hover:from-purple-600 hover:to-pink-600 active:scale-95 transition-all"
          >
            {revealAllLabel}
          </button>
        </motion.div>
      )}

      {isRevealingCompleted && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-purple-100 bg-white text-center">
          <p className="text-xs text-purple-600 font-medium">{allRevealedLabel}</p>
        </div>
      )}
    </div>
  );
}
