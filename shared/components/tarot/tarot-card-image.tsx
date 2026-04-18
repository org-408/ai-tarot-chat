import { useState } from "react";
import { CARD_ASPECT } from "../../lib/constants";
import type { DrawnCard } from "../../lib/types";

interface TarotCardImageProps {
  placement: DrawnCard;
  width?: number | string;
  height?: number | string;
  className?: string;
  /** カード画像の base パス。デフォルト: "/cards" */
  cardBasePath?: string;
}

/**
 * タロットカード画像コンポーネント。
 * 画像が存在しない場合はフォールバック表示。
 */
export const TarotCardImage: React.FC<TarotCardImageProps> = ({
  placement,
  width = 34,
  height = 60,
  className = "",
  cardBasePath = "/cards",
}) => {
  const path = `${cardBasePath}/${placement.card?.code ?? "unknown"}.png`;
  const [imgError, setImgError] = useState(false);

  const showFallback = !placement.card || imgError;

  return (
    <div
      className={`relative hover:scale-105 transition-transform cursor-pointer ${className}`}
      style={{ width, height }}
    >
      <div className="absolute -top-1 -left-1 w-4 h-4 bg-purple-600 text-white text-[7px] font-bold rounded-full flex items-center justify-center z-10">
        {placement.order}
      </div>
      {!showFallback && (
        <img
          src={path}
          alt={placement.card!.name}
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover rounded border-2 shadow-md ${
            placement.isReversed
              ? "border-red-500 rotate-180"
              : "border-amber-600"
          }`}
          style={{ aspectRatio: `${CARD_ASPECT}` }}
        />
      )}
      {showFallback && (
        <div className="w-full h-full bg-purple-100 rounded border-2 border-amber-600 shadow-md flex flex-col items-center justify-center p-0.5">
          <div className="text-base">
            {placement.card?.type === "major" ? "🌟" : "🎴"}
          </div>
          <div className="text-[6px] font-bold text-gray-800 text-center leading-tight">
            {placement.card?.name ?? "?"}
          </div>
          {placement.isReversed && (
            <div className="text-[6px] text-red-600">逆位置</div>
          )}
        </div>
      )}
    </div>
  );
};

export { CARD_ASPECT };
