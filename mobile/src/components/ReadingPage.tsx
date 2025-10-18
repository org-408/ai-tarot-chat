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
import type { CardPlacement } from "../types";
import ProfileDialog from "./ProfileDialog";
import TarotSpreadViewerSwipe from "./TarotSpreadViewerSwipe";

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

// 77枚のカードデータ（MasterDataにない場合のフォールバック）
const ReadingPage: React.FC<ReadingPageProps> = ({
  masterData,
  readingData,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tarotist, category, spread } = readingData;

  const [drawnCards, setDrawnCards] = useState<CardPlacement[]>([]);

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

  return (
    <div className="main-container">
      {/* カード表示エリア */}
      {/* <TarotSpreadViewer drawnCards={drawnCards} /> */}
      <TarotSpreadViewerSwipe
        spread={spread}
        drawnCards={drawnCards}
        onCardClick={(card: CardPlacement) =>
          console.log("Card clicked!", card)
        }
      />

      {/* チャットパネル */}
      {/* <ChatPanel
        tarotist={tarotist}
        spread={spread}
        category={category}
        drawnCards={drawnCards}
      /> */}

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
