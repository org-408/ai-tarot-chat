"use client";
import { useEffect, useState } from "react";
import type {
  AppJWTPayload,
  DrawnCard,
  MasterData,
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../../shared/lib/types";
import { useSalon } from "../lib/hooks/use-salon";
import { useClientStore } from "../lib/stores/client";
import { drawRandomCards } from "../lib/utils/salon";
import { ChatPanel } from "./chat-panel";
import ShuffleDialog from "./shuffle-dialog";
import SpreadViewerSwipe from "./spread-viewer-swipe";
import TarotistCarouselPortrait from "./tarotist-carousel-portrait";

interface ReadingData {
  tarotist: Tarotist;
  spread: Spread;
  category: ReadingCategory;
}

interface ReadingPageProps {
  payload: AppJWTPayload;
  masterData: MasterData;
  readingData: ReadingData;
  showProfile: boolean;
  setShowProfile: (show: boolean) => void;
  onBack: () => void;
}

// 77枚のカードデータ（MasterDataにない場合のフォールバック）
const ReadingPage: React.FC<ReadingPageProps> = ({
  masterData,
  readingData,
  showProfile,
  setShowProfile,
  onBack,
}) => {
  const { selectedTargetMode, setSpreadViewerMode } = useSalon();
  const { tarotist, category, spread } = readingData;

  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);

  const { currentPlan } = useClientStore.getState();

  const selectedSpread = masterData.spreads?.find((s) => s.id === spread.id);

  // カードを引く（初回のみ）
  useEffect(() => {
    if (masterData && selectedSpread) {
      const cards = drawRandomCards(masterData, selectedSpread);
      setDrawnCards(cards);
    }
  }, [masterData, selectedSpread]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // カードめくり状態・選択カードの管理をここで行う
  const [isRevealingComplete, setIsReadingComplete] = useState(false);

  useEffect(() => {
    console.log("isRevealingComplete changed:", isRevealingComplete);
    if (isRevealingComplete) {
      // カードめくり完了時の処理
      console.log("Card revealing is complete.");
      // プロフィール表示に切り替え TODO: 将来的に占い師のアニメーションを入れる
      setShowProfile(true);
    }
  }, [isRevealingComplete, setShowProfile]);

  const handleBack = () => {
    // 戻るボタン押下時にviewModeをgridに戻す
    setSpreadViewerMode("grid");
    // プロフィール表示を元に戻す
    setShowProfile(false);
    // 親コンポーネントのonBackを呼び出す
    onBack();
  };

  return (
    <div className="main-container">
      {/* カードシャッフルダイアログ drawnCards が引かれるまでの演出 */}
      <ShuffleDialog
        isOpen={!drawnCards || drawnCards.length === 0}
        onComplete={() => {
          console.log("Shuffle complete!");
        }}
      />

      {/* 上半分 */}
      <div
        className="fixed left-0 right-0 z-10"
        style={{
          top: "calc(50px + env(safe-area-inset-top))",
          height: "45vh",
          margin: "0 auto",
        }}
        onClick={() => {
          if (showProfile) setShowProfile(false);
        }}
      >
        {/* プロフィール表示エリア */}
        {showProfile && currentPlan && selectedTargetMode === "portrait" && (
          <TarotistCarouselPortrait
            masterData={masterData}
            currentPlan={currentPlan}
          />
        )}

        {/* カード表示エリア */}
        {!showProfile && drawnCards.length > 0 && (
          <SpreadViewerSwipe
            spread={spread}
            drawnCards={drawnCards}
            isRevealingComplete={isRevealingComplete}
            setIsRevealingComplete={setIsReadingComplete}
          />
        )}
      </div>

      {/* 下半分 */}
      <div
        className="fixed left-0 right-0 overflow-auto"
        style={{
          top: "calc(45vh + 50px + env(safe-area-inset-top))",
          bottom: 0,
        }}
      >
        {/* チャットパネル */}
        {drawnCards.length > 0 && (
          <ChatPanel
            currentPlan={currentPlan!}
            tarotist={tarotist}
            spread={spread}
            category={category}
            drawnCards={drawnCards}
            isRevealingComplete={isRevealingComplete}
            setIsRevealingComplete={setIsReadingComplete}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
};

export default ReadingPage;
