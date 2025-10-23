"use client";
import { useEffect, useState } from "react";
import type {
  AppJWTPayload,
  CardPlacement,
  MasterData,
  ReadingCategory,
  Spread,
  SpreadCell,
  TarotCard,
  Tarotist,
} from "../../../shared/lib/types";
import { useClientStore } from "../lib/stores/client";
import { TEMP_CARDS } from "../lib/utils/cards";
import type { ViewModeType } from "../types";
import { ChatPanel } from "./chat-panel";
import ProfileDialog from "./profile-dialog";
import ShuffleDialog from "./shuffle-dialog";
import SpreadViewerSwipe from "./spread-viewer-swipe";

interface ReadingData {
  tarotist: Tarotist;
  spread: Spread;
  category: ReadingCategory;
}

interface ReadingPageProps {
  payload: AppJWTPayload;
  masterData: MasterData;
  readingData: ReadingData;
  viewMode: ViewModeType;
  setViewMode: React.Dispatch<React.SetStateAction<ViewModeType>>;
  onBack: () => void;
}

// 77枚のカードデータ（MasterDataにない場合のフォールバック）
const ReadingPage: React.FC<ReadingPageProps> = ({
  masterData,
  readingData,
  viewMode,
  setViewMode,
  onBack,
}) => {
  const { tarotist, category, spread } = readingData;

  const [drawnCards, setDrawnCards] = useState<CardPlacement[]>([]);

  const { currentPlan } = useClientStore.getState();

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

  const [selectedTarotist, setSelectedTarotist] = useState<Tarotist | null>(
    null
  );
  const [imageViewTarotist, setImageViewTarotist] = useState<Tarotist | null>(
    null
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // カードめくり状態・選択カードの管理をここで行う
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [selectedCard, setSelectedCard] = useState<CardPlacement | null>(null);
  const [isRevealingComplete, setIsReadingComplete] = useState(false);

  const handleRevealAll = () => {
    const allCardIds = drawnCards.map((card) => card.id);
    setFlippedCards(new Set(allCardIds));
  };

  useEffect(() => {
    if (
      flippedCards.size > 0 &&
      flippedCards.size === drawnCards.length //&&
      // !selectedCard
    ) {
      setIsReadingComplete(true);
    }
  }, [flippedCards, drawnCards.length /*, selectedCard*/]);

  useEffect(() => {
    console.log("isRevealingComplete:", isRevealingComplete);
  }, [isRevealingComplete]);

  return (
    <div className="main-container">
      {/* カードシャッフルダイアログ drawnCards が引かれるまでの演出 */}
      <ShuffleDialog
        isOpen={!drawnCards || drawnCards.length === 0}
        onComplete={() => {
          console.log("Shuffle complete!");
        }}
      />

      {/* カード表示エリア */}
      {drawnCards.length > 0 && (
        <SpreadViewerSwipe
          spread={spread}
          drawnCards={drawnCards}
          flippedCards={flippedCards}
          setFlippedCards={setFlippedCards}
          selectedCard={selectedCard}
          setSelectedCard={setSelectedCard}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      )}

      {/* チャットパネル */}
      {drawnCards.length > 0 && (
        <ChatPanel
          currentPlan={currentPlan!}
          tarotist={tarotist}
          spread={spread}
          category={category}
          drawnCards={drawnCards}
          // selectedCard={selectedCard}
          isRevealingComplete={isRevealingComplete}
          onRequestRevealAll={handleRevealAll}
          onBack={onBack}
        />
      )}

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
