"use client";
/** スプレッドビューを表示してからプロフィールへ切り替えるまでの時間 (ms) */
const SPREAD_VIEW_DISPLAY_MS = 2000;

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import SpotlightCoachMark from "../../../shared/components/ui/spotlight-coach-mark";
import type { MasterData } from "../../../shared/lib/types";
import { useClient } from "../lib/hooks/use-client";
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
    quickSpread,
    drawnCards,
    setDrawnCards,
    isRevealingCompleted,
    setUpperViewerMode,
  } = useSalon();

  const { remainingReadings, quickOnboardedAt, markOnboarded } = useClient();

  // カードを引く（初回のみ）
  useEffect(() => {
    if (masterData && quickSpread) {
      const cards = drawRandomCards(masterData, quickSpread);
      setDrawnCards(cards);
    }
  }, [masterData, quickSpread, setDrawnCards]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    console.log("isRevealingComplete changed:", isRevealingCompleted);
    if (isRevealingCompleted) {
      // カードめくり完了時の処理（スプレッドビューを少し見せてからプロフィールへ切替）
      console.log("Card revealing is complete.");
      const t = setTimeout(() => setUpperViewerMode("profile"), SPREAD_VIEW_DISPLAY_MS);
      return () => clearTimeout(t);
    }
  }, [isRevealingCompleted, setUpperViewerMode]);

  const [isTopCollapsed, setIsTopCollapsed] = useState(false);

  // ===== オンボーディング (クイック占い 初回のみ) =====
  // idle    : まだスプレッドが描画されていない
  // stage1  : 上半分のカード一覧をスポットライト
  // waiting : Stage1 dismiss 後、ボタン要素の登録を待機
  // stage2  : 「一気にめくる」ボタンをスポットライト
  // done    : 完了 (既に実施済み or 今セッションで完了)
  type OnboardingStage = "idle" | "stage1" | "waiting" | "stage2" | "done";
  const [onboardingStage, setOnboardingStage] = useState<OnboardingStage>(
    quickOnboardedAt ? "done" : "idle"
  );
  const markedRef = useRef(false);

  useEffect(() => {
    if (quickOnboardedAt) {
      setOnboardingStage("done");
      markedRef.current = true;
    }
  }, [quickOnboardedAt]);

  // 上半分エリア (motion.div) と「一気にめくる」ボタンの DOM 要素
  const [upperEl, setUpperEl] = useState<HTMLElement | null>(null);
  const [revealButtonEl, setRevealButtonEl] = useState<HTMLElement | null>(null);

  const upperRefCallback = useCallback((el: HTMLDivElement | null) => {
    setUpperEl(el);
  }, []);

  // 上半分が描画されたら Stage1 へ
  useEffect(() => {
    if (onboardingStage !== "idle") return;
    if (drawnCards.length === 0) return;
    if (!upperEl) return;
    setOnboardingStage("stage1");
  }, [onboardingStage, drawnCards.length, upperEl]);

  // Stage2 はボタンが mount されてから移行（waiting → stage2）
  useEffect(() => {
    if (onboardingStage !== "waiting") return;
    if (!revealButtonEl) return;
    setOnboardingStage("stage2");
  }, [onboardingStage, revealButtonEl]);

  // 全カードめくり完了後はチュートリアル不要 → 完了扱い
  useEffect(() => {
    if (!isRevealingCompleted) return;
    if (onboardingStage === "done") return;
    setOnboardingStage("done");
    if (!markedRef.current && !quickOnboardedAt) {
      markedRef.current = true;
      void markOnboarded("quick");
    }
  }, [isRevealingCompleted, onboardingStage, quickOnboardedAt, markOnboarded]);

  const handleOnboardingStage1Dismiss = () => {
    setOnboardingStage((prev) => (prev === "stage1" ? "waiting" : prev));
  };
  const handleOnboardingStage2Dismiss = () => {
    setOnboardingStage("done");
    if (!markedRef.current && !quickOnboardedAt) {
      markedRef.current = true;
      void markOnboarded("quick");
    }
  };

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
          ref={upperRefCallback}
          className="overflow-hidden flex-shrink-0"
          animate={{ height: isTopCollapsed ? 0 : "45vh" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {drawnCards.length > 0 && <UpperViewer spread={quickSpread} />}
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
          {drawnCards.length > 0 && (
              <ChatPanel
              key={`quick-${quickSpread?.id ?? "none"}`}
              onBack={handleBack}
              onUnlock={onUnlock}
              remainingCount={remainingReadings}
              onRevealButtonElChange={setRevealButtonEl}
            />
          )}
        </div>
      </div>

      {/* オンボーディング Stage1: 上半分のカード一覧をスポットライト */}
      <SpotlightCoachMark
        isOpen={onboardingStage === "stage1"}
        targetEl={upperEl}
        title="カードを1枚ずつ、めくってみましょう"
        note={"タップすると、絵柄とメッセージが現れます。"}
        onDismiss={handleOnboardingStage1Dismiss}
        openDelayMs={400}
      />

      {/* オンボーディング Stage2: 「一気にめくる」ボタンをスポットライト */}
      <SpotlightCoachMark
        isOpen={onboardingStage === "stage2"}
        targetEl={revealButtonEl}
        title="一度にすべてを開くこともできます"
        note={"お急ぎのときは、こちらからどうぞ。"}
        onDismiss={handleOnboardingStage2Dismiss}
      />
    </div>
  );
};

export default ReadingPage;
