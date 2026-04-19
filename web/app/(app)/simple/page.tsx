"use client";

import { CategorySpreadSelector } from "@shared/components/reading/category-spread-selector";
import { ChatView } from "@shared/components/chat/chat-view";
import { RevealPromptPanel } from "@shared/components/reading/reveal-prompt-panel";
import { ShuffleDialog } from "@shared/components/reading/shuffle-dialog";
import { UpperViewer, type UpperViewerTab } from "@shared/components/tarot/upper-viewer";
import { TarotistCarouselPortrait } from "@/components/reading/tarotist-carousel-portrait";
import { useChatSession } from "@shared/hooks/use-chat-session";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useSalonStore } from "@/lib/client/stores/salon-store";
import { drawRandomCards } from "@/lib/client/services/draw-service";
import type {
  MasterData,
  ReadingCategory,
  Spread,
  Tarotist,
} from "@shared/lib/types";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, RefreshCw } from "lucide-react";

type Phase = "selection" | "reading";

const SPREAD_VIEW_DISPLAY_MS = 2000;

// ─────────────────────────────────────────────────────────────
// SimpleReadingView — reading phase を丸ごと分離し key で強制リマウント
//   これで useChatSession の messages / hasSentInitialMessage / transport が
//   「もう一度占う」時に完全にリセットされる
// ─────────────────────────────────────────────────────────────

interface SimpleReadingViewProps {
  tarotist: Tarotist;
  spread: Spread;
  category: ReadingCategory | null;
  masterData: MasterData;
  token: string;
  remainingQuick: number | undefined;
  onReadAgain: () => void;
  onHeaderBack: () => void;
  onRefreshUsage: () => Promise<void>;
  labels: {
    backToHome: string;
    remainingQuick: string;
    aiReading: string;
    readAgain: string;
    limitReached: string;
  };
}

function SimpleReadingView({
  tarotist,
  spread,
  category,
  masterData,
  token,
  remainingQuick,
  onReadAgain,
  onHeaderBack,
  onRefreshUsage,
  labels,
}: SimpleReadingViewProps) {
  const {
    drawnCards,
    isRevealingCompleted,
    setDrawnCards,
    setIsRevealingCompleted,
    setIsLocked,
  } = useSalonStore();

  const [isShuffleDone, setIsShuffleDone] = useState(false);
  const [upperTab, setUpperTab] = useState<UpperViewerTab>("grid");
  const [isTopCollapsed, setIsTopCollapsed] = useState(false);
  const hasDrawnRef = useRef(false);

  // カード抽出（一度だけ）
  useEffect(() => {
    if (hasDrawnRef.current) return;
    hasDrawnRef.current = true;
    const cards = drawRandomCards(masterData, spread);
    setDrawnCards(cards);
  }, [masterData, spread, setDrawnCards]);

  const handleShuffleComplete = useCallback(() => {
    setIsShuffleDone(true);
  }, []);

  const handleRevealAll = useCallback(() => {
    setIsRevealingCompleted(true);
  }, [setIsRevealingCompleted]);

  const {
    messages,
    status,
    isMessageComplete,
    error,
    handleRetry,
  } = useChatSession(
    {
      api: "/api/readings/simple",
      token,
      isPersonal: false,
      isPhase2: false,
      tarotist,
      spread,
      category: category ?? undefined,
      drawnCards,
      isRevealingCompleted,
    },
    {
      onRefreshUsage,
      onRefreshToken: async () => token,
      onUnlock: () => setIsLocked(false),
    },
  );

  // メッセージ完了/エラー時はロック解除（安全網）
  useEffect(() => {
    if (isMessageComplete || error) {
      setIsLocked(false);
    }
  }, [isMessageComplete, error, setIsLocked]);

  // 全カードめくり完了 → SPREAD_VIEW_DISPLAY_MS 後にプロフィールへ
  useEffect(() => {
    if (!isRevealingCompleted) return;
    const timer = setTimeout(() => setUpperTab("profile"), SPREAD_VIEW_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [isRevealingCompleted]);

  const tarotistImageUrl = `/tarotists/${tarotist.name}.png`;
  const canReadAgain = remainingQuick === undefined || remainingQuick > 0;

  return (
    <>
      <ShuffleDialog
        isOpen={drawnCards.length === 0 || !isShuffleDone}
        onComplete={handleShuffleComplete}
        cardBackPath="/cards/back.png"
      />

      <div className="flex flex-col h-[100dvh] -m-4 md:-m-6">
        {/* ヘッダー */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-purple-100">
          <Link
            href="/"
            onClick={onHeaderBack}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors"
          >
            <ArrowLeft size={16} />
            {labels.backToHome}
          </Link>
          {remainingQuick !== undefined && (
            <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full">
              {labels.remainingQuick}
            </span>
          )}
        </div>

        {/* 上半分: UpperViewer (折りたたみ可) */}
        <motion.div
          className="flex-shrink-0 overflow-hidden"
          animate={{ height: isTopCollapsed ? 0 : "45vh" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {isShuffleDone && drawnCards.length > 0 && (
            <UpperViewer
              spread={spread}
              drawnCards={drawnCards}
              isRevealingCompleted={isRevealingCompleted}
              onRevealingCompleted={() => setIsRevealingCompleted(true)}
              tarotistImageUrl={tarotistImageUrl}
              tarotistName={tarotist.name}
              cardBasePath="/cards"
              activeTab={upperTab}
              onActiveTabChange={setUpperTab}
              flipCardWidth={72}
              flipCardHeight={124}
            />
          )}
        </motion.div>

        {/* アコーディオントグル */}
        <button
          type="button"
          onClick={() => setIsTopCollapsed((v) => !v)}
          className="flex-shrink-0 w-full h-7 flex items-center justify-center bg-white z-30"
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

        {/* 下半分: ChatView (Phase1 input 非表示、Markdown 整形あり、アバターなし) */}
        <div className="flex-1 overflow-hidden relative">
          <ChatView
            messages={messages}
            status={status}
            inputValue=""
            onInputChange={() => {}}
            onSend={() => {}}
            inputDisabled={true}
            isMessageComplete={isMessageComplete}
            error={error}
            onRetry={handleRetry}
            showAvatar={false}
            footer={
              isShuffleDone && !isRevealingCompleted && drawnCards.length > 0 ? (
                <RevealPromptPanel
                  isAllRevealed={isRevealingCompleted}
                  onRevealAll={handleRevealAll}
                />
              ) : null
            }
          />

          {/* 占い完了後のアクション */}
          {isMessageComplete && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-40 pointer-events-none">
              {canReadAgain ? (
                <button
                  type="button"
                  onClick={onReadAgain}
                  className="pointer-events-auto flex items-center gap-2 px-5 py-3 bg-white shadow-xl rounded-full text-sm font-bold text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <RefreshCw size={14} />
                  {labels.readAgain}
                </button>
              ) : (
                <div className="pointer-events-auto px-5 py-3 bg-gray-100 rounded-full text-sm font-medium text-gray-400">
                  {labels.limitReached}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SimplePage
// ─────────────────────────────────────────────────────────────

export default function SimplePage() {
  const t = useTranslations("simple");
  const tSalon = useTranslations("salon");
  const tCommon = useTranslations("common");
  const { data: session } = useSession();

  const { data: masterData, init: initMaster, tarotists, categories, spreads, isLoading } =
    useMasterStore();
  const {
    quickTarotist: selectedTarotist,
    quickSpread: selectedSpread,
    quickCategory: selectedCategory,
    setQuickTarotist,
    setQuickSpread,
    setQuickCategory,
    setIsLocked,
    resetSession,
  } = useSalonStore();
  const { refreshUsage, usage } = useClientStore();

  const [phase, setPhase] = useState<Phase>("selection");
  const [readingKey, setReadingKey] = useState(0);

  const token = (session as { accessToken?: string })?.accessToken ?? "";

  useEffect(() => {
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage]);

  // ページ離脱時にロック解除（安全網）
  useEffect(() => {
    return () => setIsLocked(false);
  }, [setIsLocked]);

  const handleStartReading = ({
    category,
    spread,
  }: {
    category: ReadingCategory | null;
    spread: Spread;
  }) => {
    setQuickSpread(spread);
    setQuickCategory(category);
    resetSession();
    setIsLocked(true);
    setPhase("reading");
  };

  const handleReadAgain = () => {
    resetSession();
    setIsLocked(true);
    setReadingKey((k) => k + 1);
    setPhase("reading");
  };

  const handleHeaderBack = () => {
    resetSession();
    setIsLocked(false);
  };

  const remainingQuick = usage?.remainingReadings;
  const currentPlan = usage?.plan as Parameters<typeof CategorySpreadSelector>[0]["currentPlan"];

  // ═════════════════════════════════════════════════════════════
  // Phase: reading
  // ═════════════════════════════════════════════════════════════
  if (
    phase === "reading" &&
    selectedTarotist &&
    selectedSpread &&
    masterData
  ) {
    return (
      <SimpleReadingView
        key={readingKey}
        tarotist={selectedTarotist}
        spread={selectedSpread}
        category={selectedCategory}
        masterData={masterData}
        token={token}
        remainingQuick={remainingQuick}
        onReadAgain={handleReadAgain}
        onHeaderBack={handleHeaderBack}
        onRefreshUsage={refreshUsage}
        labels={{
          backToHome: tCommon("backToHome"),
          remainingQuick:
            remainingQuick !== undefined
              ? tSalon("remainingQuick", { count: remainingQuick })
              : "",
          aiReading: t("aiReading"),
          readAgain: t("readAgain"),
          limitReached: t("limitReached"),
        }}
      />
    );
  }

  // ═════════════════════════════════════════════════════════════
  // Phase: selection
  // ═════════════════════════════════════════════════════════════
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors"
        >
          <ArrowLeft size={16} />
          {tCommon("backToHome")}
        </Link>
        {remainingQuick !== undefined && (
          <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-100">
            {tSalon("remainingQuick", { count: remainingQuick })}
          </span>
        )}
      </div>

      <h1 className="text-xl font-bold text-gray-800">{t("title")}</h1>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-purple-300 border-t-purple-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            className="bg-white/50 rounded-2xl border shadow-sm overflow-hidden"
            style={{ height: "600px" }}
          >
            <TarotistCarouselPortrait
              tarotists={tarotists}
              selectedTarotist={selectedTarotist}
              onSelect={setQuickTarotist}
              currentPlan={
                (usage?.plan as Parameters<typeof TarotistCarouselPortrait>[0]["currentPlan"]) ??
                null
              }
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-4">
            <CategorySpreadSelector
              categories={categories}
              spreads={spreads}
              currentPlan={currentPlan}
              isPersonal={false}
              remainingCount={remainingQuick}
              disabled={!selectedTarotist}
              onStartReading={handleStartReading}
              labels={{
                selectSpreadPrompt: tSalon("selectSpread"),
                selectCategoryAndSpreadPrompt: tSalon("selectCategoryAndSpread"),
                categoryLabel: tSalon("categoryLabel"),
                spreadLabel: tSalon("spreadLabel"),
                selectPlaceholder: tSalon("selectPlaceholder"),
                categoryQuestion: tSalon("categoryQuestion"),
                spreadQuestion: tSalon("spreadQuestion"),
                spreadSubtitle: tSalon("spreadSubtitle"),
                startReading: tSalon("startReading"),
                limitReached: tSalon("limitReached"),
                remainingText:
                  remainingQuick !== undefined && remainingQuick > 0
                    ? tSalon("remainingToday", { count: remainingQuick })
                    : undefined,
                disabledMessage: tSalon("selectTarotistFirst"),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
