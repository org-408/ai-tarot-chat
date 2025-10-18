import { motion } from "framer-motion";
import React from "react";
import type { TarotCard } from "../../../shared/lib/types";
import type { CardPlacement } from "../types";

const CARD_ASPECT = 300 / 527;

const VIEW_HEIGHT_MAX = 300;

interface FanViewProps {
  drawnCards: CardPlacement[];
  selectedCard: CardPlacement | null;
  flippedCards: Set<string>;
  onCardClick: (card: CardPlacement) => void;
  onToggleFlip: (cardId: string) => void;
  getCardImagePath: (card: TarotCard, isBack?: boolean) => string;
}

// ファン配置コンポーネント
const FanView: React.FC<FanViewProps> = ({
  drawnCards,
  selectedCard,
  flippedCards,
  onCardClick,
  onToggleFlip,
  getCardImagePath,
}) => {
  const totalCards = drawnCards.length;

  // === 調整パラメータ ===
  const fanAngle = 80; // 扇の開き角度（大きいほど広がる）
  const cardWidth = 80; // カードの幅
  const cardHeight = cardWidth / CARD_ASPECT; // カードの高さ
  const spreadRadius = 150; // 扇の半径（大きいほど横に広がる）
  const depthFactor = 8; // 奥行き係数（小さいほど平らに）
  // ====================

  return (
    <div
      className="relative flex items-center justify-center overflow-visible"
      style={{ height: `${VIEW_HEIGHT_MAX}px` }}
    >
      {drawnCards.map((card, index) => {
        const centerIndex = (totalCards - 1) / 2;
        const angleOffset = ((index - centerIndex) / totalCards) * fanAngle;
        const zIndex = (totalCards - index) * 5;
        const isFlipped = flippedCards.has(card.id);

        const angleRad = (angleOffset * Math.PI) / 180;
        const xOffset = Math.sin(angleRad) * spreadRadius;
        const yOffset =
          Math.abs(index - centerIndex) * depthFactor + VIEW_HEIGHT_MAX / 4;

        return (
          <motion.div
            key={card.id}
            className="absolute"
            style={{
              width: cardWidth,
              height: cardHeight,
              zIndex,
              transformOrigin: "center center",
            }}
            initial={{ scale: 0, opacity: 0, rotate: angleOffset, x: 0 }}
            animate={{
              scale: selectedCard?.id === card.id ? 1.15 : 1,
              rotate: angleOffset,
              opacity: 1,
              x: xOffset,
              y: yOffset,
            }}
            transition={{
              delay: index * 0.06,
              type: "spring",
              stiffness: 180,
              damping: 15,
            }}
            onClick={() => {
              if (isFlipped) onCardClick(card);
              onToggleFlip(card.id);
            }}
          >
            <div className="relative w-full h-full cursor-pointer group">
              <motion.div
                className="absolute inset-0"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <div
                  className="absolute inset-0 rounded-lg border-3 border-purple-400 shadow-2xl overflow-hidden"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <img
                    src={getCardImagePath(card.card, true)}
                    alt="Card Back"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div
                  className="absolute inset-0 rounded-lg border-3 border-white shadow-2xl overflow-hidden"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <img
                    src={getCardImagePath(card.card)}
                    alt={card.card.name}
                    className={`w-full h-full object-cover ${
                      card.isReversed ? "transform rotate-180" : ""
                    }`}
                  />
                  <div className="absolute top-1 left-1 w-6 h-6 bg-white/90 text-purple-900 rounded-full flex items-center justify-center text-xs font-bold">
                    {card.number}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default FanView;
