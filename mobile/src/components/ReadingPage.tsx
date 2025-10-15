"use client";
import { useEffect, useState } from "react";
import type {
  AppJWTPayload,
  MasterData,
  ReadingCategory,
  Spread,
  SpreadCell,
  TarotCard,
  Tarotist,
} from "../../../shared/lib/types";
import { TEMP_CARDS } from "../lib/utils/cards";
import { ChatPanel } from "./ChatPanel";
import ProfileDialog from "./ProfileDialog";

interface ReadingData {
  tarotist: Tarotist;
  spread: Spread;
  category: ReadingCategory;
}

interface ReadingPageProps {
  payload: AppJWTPayload;
  masterData: MasterData;
  readingData: ReadingData;
  onBack: () => void;
}

// カード配置情報の型
interface CardPlacement {
  id: string;
  number: number;
  gridX: number;
  gridY: number;
  rotation: number;
  card: TarotCard;
  isReversed: boolean;
  position: string;
  description: string;
}

// 77枚のカードデータ（MasterDataにない場合のフォールバック）
const ReadingPage: React.FC<ReadingPageProps> = ({
  masterData,
  readingData,
}) => {
  const { tarotist, category, spread } = readingData;

  const [crossFlipped, setCrossFlipped] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardPlacement | null>(null);
  const [drawnCards, setDrawnCards] = useState<CardPlacement[]>([]);
  const [selectedTarotist, setSelectedTarotist] = useState<Tarotist | null>(
    null
  );
  const [imageViewTarotist, setImageViewTarotist] = useState<Tarotist | null>(
    null
  );
  const [imageCache, setImageCache] = useState<{ [key: string]: boolean }>({});

  // カードをランダムに引く関数
  const drawRandomCards = (
    allCards: TarotCard[],
    spreadCells: SpreadCell[],
    count: number
  ): CardPlacement[] => {
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    return spreadCells.map((cell, index) => {
      const card = selected[index];
      const isReversed = Math.random() > 0.5;

      return {
        id: `${card.id}-${index}`,
        number: cell.vOrder || cell.hOrder || index,
        gridX: cell.x,
        gridY: cell.y,
        rotation: cell.hLabel ? 90 : 0,
        card,
        isReversed,
        position: cell.vLabel || cell.hLabel || `位置${index + 1}`,
        description: `このカードの位置は${
          cell.vLabel || cell.hLabel
        }を示しています`,
      };
    });
  };

  // カード画像パスを生成
  const getCardImagePath = (card: TarotCard): string => {
    return `/cards/${card.code}.png`;
  };

  const selectedSpread = masterData.spreads?.find((s) => s.id === spread.id);
  const availableCards = masterData.decks?.[0]?.cards || TEMP_CARDS;

  // カードを引く（初回のみ）
  useEffect(() => {
    if (availableCards && selectedSpread?.cells && drawnCards.length === 0) {
      const cards = drawRandomCards(
        availableCards,
        selectedSpread.cells,
        selectedSpread.cells.length
      );
      setDrawnCards(cards);
    }
  }, [availableCards, selectedSpread, drawnCards.length]);

  // 画像の存在確認を初回のみ実施
  useEffect(() => {
    if (!drawnCards.length) return;
    drawnCards.forEach((placement) => {
      const path = `/cards/${placement.card.code}.png`;
      if (imageCache[path] === undefined) {
        fetch(path, { method: "HEAD", cache: "force-cache" })
          .then((res) => {
            setImageCache((prev) => ({ ...prev, [path]: res.ok }));
          })
          .catch(() => {
            setImageCache((prev) => ({ ...prev, [path]: false }));
          });
      }
    });
  }, [drawnCards, imageCache]);

  // クロス配置のアニメーション
  useEffect(() => {
    const interval = setInterval(() => {
      setCrossFlipped((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const gridCols =
    drawnCards.length > 0 ? Math.max(...drawnCards.map((c) => c.gridX)) + 1 : 4;
  const gridRows =
    drawnCards.length > 0 ? Math.max(...drawnCards.map((c) => c.gridY)) + 1 : 4;

  const cardSize = 60;
  const colGap = 6;
  const rowGap = 12;
  const visibleCols = 4;
  const visibleRows = 4;
  const visibleAreaWidth = cardSize * visibleCols + colGap * (visibleCols + 1);
  const visibleAreaHeight = cardSize * visibleRows + rowGap * (visibleRows + 1);

  const getZIndex = (cardNumber: number) => {
    const crossCards = drawnCards.filter(
      (c) => c.rotation === 90 || c.rotation === 0
    );
    if (crossCards.length >= 2) {
      if (cardNumber === crossCards[0].number) return crossFlipped ? 20 : 10;
      if (cardNumber === crossCards[1].number) return crossFlipped ? 10 : 20;
    }
    return 5;
  };

  // カード画像コンポーネント
  interface TarotCardImageProps {
    placement: CardPlacement;
    width?: number | string;
    height?: number | string;
    className?: string;
  }

  const CARD_ASPECT = 300 / 523;
  const GRID_CARD_HEIGHT = 60;
  const GRID_CARD_WIDTH =
    Math.round(GRID_CARD_HEIGHT * CARD_ASPECT * 100) / 100;
  const DIALOG_CARD_WIDTH = 160;
  const DIALOG_CARD_HEIGHT =
    Math.round((DIALOG_CARD_WIDTH / CARD_ASPECT) * 100) / 100;

  const TarotCardImage: React.FC<TarotCardImageProps> = ({
    placement,
    width = `${GRID_CARD_WIDTH}px`,
    height = `${GRID_CARD_HEIGHT}px`,
    className = "",
  }) => {
    const path = getCardImagePath(placement.card);
    const exists = imageCache[path];
    return (
      <div
        className={`relative hover:scale-105 transition-transform cursor-pointer ${className}`}
        style={{ width, height }}
      >
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-purple-600 text-white text-[7px] font-bold rounded-full flex items-center justify-center z-10">
          {placement.number}
        </div>
        {exists && (
          <img
            src={path}
            alt={placement.card.name}
            className={`w-full h-full object-cover rounded border-2 shadow-md ${
              placement.isReversed
                ? "border-red-500 transform rotate-180"
                : "border-amber-600"
            }`}
            style={{ aspectRatio: `${CARD_ASPECT}` }}
          />
        )}
        {!exists && (
          <div className="w-full h-full bg-purple-100 rounded border-2 border-amber-600 shadow-md flex flex-col items-center justify-center p-0.5">
            <div className="text-base">
              {placement.card.type === "major" ? "🌟" : "🎴"}
            </div>
            <div className="text-[6px] font-bold text-gray-800 text-center leading-tight">
              {placement.card.name}
            </div>
            {placement.isReversed && (
              <div className="text-[6px] text-red-600">逆位置</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="main-container">
      {/* カード表示エリア */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 border border-purple-200 shadow-md mb-3">
        <div className="flex gap-2">
          <div
            className="flex-shrink-0 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-2 border border-purple-200"
            style={{
              width: `${visibleAreaWidth}px`,
              height: `${visibleAreaHeight}px`,
              overflowY: gridRows > visibleRows ? "auto" : "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${gridCols}, 60px)`,
                gridTemplateRows: `repeat(${gridRows}, 60px)`,
                columnGap: `${colGap}px`,
                rowGap: `${rowGap}px`,
              }}
            >
              {drawnCards.map((placement) => (
                <div
                  key={placement.id}
                  style={{
                    gridColumn: placement.gridX + 1,
                    gridRow: placement.gridY + 1,
                    transform: `rotate(${placement.rotation}deg)`,
                    transformOrigin: "center center",
                    zIndex: getZIndex(placement.number),
                    transition: "z-index 0.5s ease-in-out",
                  }}
                  className="flex items-center justify-center"
                >
                  <div
                    onClick={() => setSelectedCard(placement)}
                    style={{ cursor: "pointer" }}
                  >
                    <TarotCardImage
                      placement={placement}
                      width={`${GRID_CARD_WIDTH}px`}
                      height={`${GRID_CARD_HEIGHT}px`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

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
              <div className="">
                {drawnCards.map((placement) => (
                  <button
                    key={placement.id}
                    onClick={() => setSelectedCard(placement)}
                    className="w-full bg-purple-50 hover:bg-purple-100 rounded p-1 border border-purple-200 transition-colors text-left"
                  >
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-purple-600 text-white text-[7px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                        {placement.number}
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
                {selectedCard.number}
              </div>
              <h3 className="text-base font-bold text-purple-900">
                位置の意味:{selectedCard.position}
              </h3>
            </div>
            <div className="text-xs text-gray-600 mb-2 pb-2">
              {selectedCard.description}
            </div>
            <div className="flex justify-center mb-2">
              <TarotCardImage
                placement={selectedCard}
                width={`${DIALOG_CARD_WIDTH}px`}
                height={`${DIALOG_CARD_HEIGHT}px`}
              />
            </div>
            <div className="text-sm text-gray-700 mb-2">
              カード:{" "}
              <span className="font-semibold">{selectedCard.card.name}</span>
              {selectedCard.isReversed && (
                <span className="text-red-600 ml-2">(逆位置)</span>
              )}
            </div>
            <div className="text-xs text-gray-600 mb-2">
              キーワード:{" "}
              {selectedCard.isReversed
                ? selectedCard.card.reversedKeywords.join("、")
                : selectedCard.card.uprightKeywords.join("、")}
            </div>
            <button
              onClick={() => setSelectedCard(null)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 font-medium transition-colors text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* チャットパネル */}
      <ChatPanel
        tarotist={tarotist}
        spread={spread}
        category={category}
        drawnCards={drawnCards}
      />

      {/* 占い師ダイアログ */}
      <ProfileDialog
        selectedTarotist={selectedTarotist}
        setSelectedTarotist={setSelectedTarotist}
        imageViewTarotist={imageViewTarotist}
        setImageViewTarotist={setImageViewTarotist}
      />
    </div>
  );
};

export default ReadingPage;
