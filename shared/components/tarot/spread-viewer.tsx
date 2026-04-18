import { useEffect, useState } from "react";
import type { DrawnCard } from "../../lib/types";
import { CARD_ASPECT, TarotCardImage } from "./tarot-card-image";

interface SpreadViewerProps {
  drawnCards: DrawnCard[];
  /** カード画像の base パス。デフォルト: "/cards" */
  cardBasePath?: string;
}

const GRID_CARD_HEIGHT = 60;
const GRID_CARD_WIDTH = Math.round(GRID_CARD_HEIGHT * CARD_ASPECT * 100) / 100;
const DIALOG_CARD_WIDTH = 160;
const DIALOG_CARD_HEIGHT = Math.round((DIALOG_CARD_WIDTH / CARD_ASPECT) * 100) / 100;

const COL_GAP = 6;
const ROW_GAP = 12;
const VISIBLE_COLS = 4;
const VISIBLE_ROWS = 4;

/**
 * スプレッドビューワー。
 * 引いたカードをグリッドで表示し、クリックで詳細ダイアログを開く。
 * プラットフォーム非依存。
 */
export const SpreadViewer: React.FC<SpreadViewerProps> = ({
  drawnCards,
  cardBasePath = "/cards",
}) => {
  const [selectedCard, setSelectedCard] = useState<DrawnCard | null>(null);
  const [crossFlipped, setCrossFlipped] = useState(false);

  // クロス配置のアニメーション (z-index を交互に入れ替え)
  useEffect(() => {
    const interval = setInterval(() => {
      setCrossFlipped((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const gridCols =
    drawnCards.length > 0 ? Math.max(...drawnCards.map((c) => c.x)) + 1 : 4;
  const gridRows =
    drawnCards.length > 0 ? Math.max(...drawnCards.map((c) => c.y)) + 1 : 4;

  const visibleAreaWidth =
    GRID_CARD_WIDTH * VISIBLE_COLS + COL_GAP * (VISIBLE_COLS + 1);
  const visibleAreaHeight =
    GRID_CARD_HEIGHT * VISIBLE_ROWS + ROW_GAP * (VISIBLE_ROWS + 1);

  const getZIndex = (order: number) => {
    const cross = drawnCards.filter(() => true);
    if (cross.length >= 2) {
      if (order === cross[0].order) return crossFlipped ? 20 : 10;
      if (order === cross[1].order) return crossFlipped ? 10 : 20;
    }
    return 5;
  };

  return (
    <>
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 border border-purple-200 shadow-md mb-3">
        <div className="flex gap-2">
          {/* グリッドエリア */}
          <div
            className="flex-shrink-0 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-2 border border-purple-200"
            style={{
              width: `${visibleAreaWidth}px`,
              height: `${visibleAreaHeight}px`,
              overflowY: gridRows > VISIBLE_ROWS ? "auto" : "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${gridCols}, ${GRID_CARD_WIDTH}px)`,
                gridTemplateRows: `repeat(${gridRows}, ${GRID_CARD_HEIGHT}px)`,
                columnGap: `${COL_GAP}px`,
                rowGap: `${ROW_GAP}px`,
              }}
            >
              {drawnCards.map((placement) => (
                <div
                  key={placement.id}
                  style={{
                    gridColumn: placement.x + 1,
                    gridRow: placement.y + 1,
                    transform: `rotate(${placement.isHorizontal ? 90 : 0}deg)`,
                    transformOrigin: "center center",
                    zIndex: getZIndex(placement.order),
                  }}
                  className="flex items-center justify-center cursor-pointer"
                  onClick={() => setSelectedCard(placement)}
                >
                  <TarotCardImage
                    placement={placement}
                    width={`${GRID_CARD_WIDTH}px`}
                    height={`${GRID_CARD_HEIGHT}px`}
                    cardBasePath={cardBasePath}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 位置の意味リスト */}
          <div
            className="flex-1 bg-white rounded-lg border border-purple-200 flex flex-col"
            style={{ height: `${visibleAreaHeight}px` }}
          >
            <div className="p-1 border-b border-purple-200 flex-shrink-0">
              <div className="text-[9px] font-bold text-purple-900 text-center">
                位置の意味
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {drawnCards.map((placement) => (
                <button
                  key={placement.id}
                  onClick={() => setSelectedCard(placement)}
                  className="w-full bg-purple-50 hover:bg-purple-100 rounded p-1 border border-purple-200 transition-colors text-left"
                >
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-purple-600 text-white text-[7px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                      {placement.order}
                    </div>
                    <div className="text-[10px] font-semibold text-purple-900 leading-tight">
                      {placement.position}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* カード詳細ダイアログ */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-white rounded-2xl p-4 max-w-xs w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-purple-600 text-white text-sm font-bold rounded-full flex items-center justify-center">
                {selectedCard.order}
              </div>
              <h3 className="text-base font-bold text-purple-900">
                位置の意味: {selectedCard.position}
              </h3>
            </div>
            {selectedCard.description && (
              <div className="text-xs text-gray-600 mb-2 pb-2 border-b border-gray-200">
                {selectedCard.description}
              </div>
            )}
            <div className="flex justify-center mb-3">
              <TarotCardImage
                placement={selectedCard}
                width={`${DIALOG_CARD_WIDTH}px`}
                height={`${DIALOG_CARD_HEIGHT}px`}
                cardBasePath={cardBasePath}
              />
            </div>
            <div className="text-sm text-gray-700 mb-2">
              カード:{" "}
              <span className="font-semibold">{selectedCard.card?.name}</span>
              {selectedCard.isReversed && (
                <span className="text-red-600 ml-2">(逆位置)</span>
              )}
            </div>
            <div className="text-xs text-gray-600 mb-3">
              キーワード:{" "}
              {selectedCard.isReversed
                ? selectedCard.card?.reversedKeywords.join("、")
                : selectedCard.card?.uprightKeywords.join("、")}
            </div>
            <button
              type="button"
              onClick={() => setSelectedCard(null)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 font-medium transition-colors text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
};
