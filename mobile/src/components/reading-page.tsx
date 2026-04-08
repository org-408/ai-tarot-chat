"use client";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { MasterData } from "../../../shared/lib/types";
import { useSalon } from "../lib/hooks/use-salon";
import { drawRandomCards } from "../lib/utils/salon";
import { ChatPanel } from "./chat-panel";
import ShuffleDialog from "./shuffle-dialog";
import UpperViewer from "./upper-viewer";

interface ReadingPageProps {
  masterData: MasterData;
  onBack: () => void;
  /** AI 課金終了（戻るボタン表示可能）時にナビゲーションロックを解除する */
  onUnlock: () => void;
}

const ReadingPage: React.FC<ReadingPageProps> = ({ masterData, onBack, onUnlock }) => {
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

  const [isTopCollapsed, setIsTopCollapsed] = useState(false);

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

      {/* 上下統合ラッパー */}
      <div
        className="fixed left-0 right-0 flex flex-col"
        style={{
          top: "calc(50px + env(safe-area-inset-top))",
          bottom: 0,
        }}
      >
        {/* 上半分（アコーディオン） */}
        <motion.div
          className="overflow-hidden flex-shrink-0"
          animate={{ height: isTopCollapsed ? 0 : "45vh" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {drawnCards.length > 0 && <UpperViewer />}
        </motion.div>

        {/* アコーディオントグル */}
        <button
          type="button"
          onClick={() => setIsTopCollapsed((v) => !v)}
          className="flex-shrink-0 w-full h-7 flex items-center justify-center z-30"
        >
          <div className="bg-gray-200/80 rounded-full px-3 py-0.5 flex items-center">
            <motion.div
              animate={{ rotate: isTopCollapsed ? 0 : 180 }}
              transition={{ duration: 0.25 }}
            >
              <ChevronDown size={14} className="text-gray-500" />
            </motion.div>
          </div>
        </button>

        {/* 下半分 */}
        <div className="flex-1 min-h-0">
          {drawnCards.length > 0 && <ChatPanel onBack={handleBack} onUnlock={onUnlock} />}
        </div>
      </div>
    </div>
  );
};

export default ReadingPage;
