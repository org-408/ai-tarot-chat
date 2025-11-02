"use client";
import { useEffect } from "react";
import type {
  AppJWTPayload,
  MasterData,
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../../shared/lib/types";
import { useSalon } from "../lib/hooks/use-salon";
import { drawRandomCards } from "../lib/utils/salon";
import { ChatPanel } from "./chat-panel";
import ShuffleDialog from "./shuffle-dialog";
import UpperViewer from "./upper-viewer";

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
const ReadingPage: React.FC<ReadingPageProps> = ({ masterData, onBack }) => {
  const {
    selectedSpread,
    drawnCards,
    setDrawnCards,
    isRevealingCompleted,
    setUpperViewerMode,
  } = useSalon();

  // カードを引く（初回のみ）
  useEffect(() => {
    if (masterData && selectedSpread) {
      const cards = drawRandomCards(masterData, selectedSpread);
      setDrawnCards(cards);
    }
  }, [masterData, selectedSpread, setDrawnCards]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    console.log("isRevealingComplete changed:", isRevealingCompleted);
    if (isRevealingCompleted) {
      // カードめくり完了時の処理
      console.log("Card revealing is complete.");
      // プロフィール表示に切り替え TODO: 将来的に占い師のアニメーションを入れる
      setUpperViewerMode("profile");
    }
  }, [isRevealingCompleted, setUpperViewerMode]);

  const handleBack = () => {
    // 戻るボタン押下時にviewModeをgridに戻す
    setUpperViewerMode("grid");
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
      >
        {/* カード表示エリア */}
        {drawnCards.length > 0 && <UpperViewer />}
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
        {drawnCards.length > 0 && <ChatPanel onBack={handleBack} />}
      </div>
    </div>
  );
};

export default ReadingPage;
