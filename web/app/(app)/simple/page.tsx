"use client";

import { ShuffleDialog } from "@shared/components/reading/shuffle-dialog";
import { ChatColumn } from "@/components/reading/chat-column";
import { SelectionView } from "@/components/reading/selection-view";
import { SpreadRevealColumn } from "@/components/reading/spread-reveal-column";
import { TwoColumnReadingLayout } from "@/components/reading/two-column-reading-layout";
import { useReadingChat } from "@shared/hooks/use-reading-chat";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useSalonStore } from "@/lib/client/stores/salon-store";
import { drawRandomCards } from "@/lib/client/services/draw-service";
import type {
  DrawnCard,
  MasterData,
  Plan,
  ReadingCategory,
  Spread,
  Tarotist,
} from "@shared/lib/types";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

type Phase = "selection" | "reading";

// ─────────────────────────────────────────────────────────────
// SimpleReadingView — reading phase 丸ごと分離（key で強制リマウント）
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
    readAgain: string;
    limitReached: string;
    lockedDuringReading: string;
    showSpread: string;
    hideSpread: string;
    revealAll: string;
    revealPrompt: string;
    allRevealed: string;
    tabSpread: string;
    tabIndividual: string;
    cardDetailPosition: string;
    cardDetailCard: string;
    cardDetailKeywords: string;
    cardDetailReversed: string;
  };
}

interface SimpleReadingChatProps {
  tarotist: Tarotist;
  spread: Spread;
  category: ReadingCategory | null;
  token: string;
  drawnCards: DrawnCard[];
  isRevealingCompleted: boolean;
  remainingQuick: number | undefined;
  onReadAgain: () => void;
  onRefreshUsage: () => Promise<void>;
  onUnlock: () => void;
  labels: SimpleReadingViewProps["labels"];
}

function SimpleReadingChat({
  tarotist,
  spread,
  category,
  token,
  drawnCards,
  isRevealingCompleted,
  remainingQuick,
  onReadAgain,
  onRefreshUsage,
  onUnlock,
  labels,
}: SimpleReadingChatProps) {
  const {
    messages,
    status,
    inputValue,
    inputDisabled,
    isMessageComplete,
    error,
    handleInputChange,
    handleSend,
    handleKeyDown,
    handleRetry,
  } = useReadingChat(
    {
      api: "/api/readings/simple",
      token,
      isPersonal: false,
      tarotist,
      spread,
      category: category ?? undefined,
      drawnCards,
      isRevealingCompleted,
    },
    {
      onRefreshUsage,
      onRefreshToken: async () => token,
      onUnlock,
    },
  );

  const tarotistImageUrl = `/tarotists/${tarotist.name}.png`;
  const canReadAgain = remainingQuick === undefined || remainingQuick > 0;

  return (
    <div className="relative h-full">
      <ChatColumn
        tarotistImageUrl={tarotistImageUrl}
        tarotistName={tarotist.name}
        tarotistIcon={tarotist.icon}
        tarotistTitle={tarotist.title}
        tarotistTrait={tarotist.trait}
        messages={messages}
        status={status}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onSend={handleSend}
        onKeyDown={handleKeyDown}
        inputDisabled={inputDisabled}
        isMessageComplete={isMessageComplete}
        error={error}
        onRetry={handleRetry}
      />

      {isMessageComplete && !error && (
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
  );
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
    isLocked,
    setDrawnCards,
    setIsRevealingCompleted,
    setIsLocked,
  } = useSalonStore();

  const [isShuffleDone, setIsShuffleDone] = useState(false);
  const [rightVisible, setRightVisible] = useState(true);
  const hasDrawnRef = useRef(false);

  // カード抽出（一度だけ）
  useEffect(() => {
    if (hasDrawnRef.current) return;
    hasDrawnRef.current = true;
    const cards = drawRandomCards(masterData, spread);
    setDrawnCards(cards);
  }, [masterData, spread, setDrawnCards]);

  return (
    <>
      <ShuffleDialog
        isOpen={!isShuffleDone && drawnCards.length === 0}
        onComplete={() => setIsShuffleDone(true)}
        cardBackPath="/cards/back.png"
      />

      <TwoColumnReadingLayout
        isLocked={isLocked}
        onHeaderBack={onHeaderBack}
        backLabel={labels.backToHome}
        lockedLabel={labels.lockedDuringReading}
        rightVisible={rightVisible}
        onToggleRight={() => setRightVisible((v) => !v)}
        showSpreadLabel={labels.showSpread}
        hideSpreadLabel={labels.hideSpread}
        headerRight={
          remainingQuick !== undefined ? (
            <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full">
              {labels.remainingQuick}
            </span>
          ) : null
        }
        left={
          drawnCards.length > 0 ? (
            <SimpleReadingChat
              key={`quick-chat-${spread.id}`}
              tarotist={tarotist}
              spread={spread}
              category={category}
              token={token}
              drawnCards={drawnCards}
              isRevealingCompleted={isRevealingCompleted}
              remainingQuick={remainingQuick}
              onReadAgain={onReadAgain}
              onRefreshUsage={onRefreshUsage}
              onUnlock={() => setIsLocked(false)}
              labels={labels}
            />
          ) : (
            <div className="h-full" />
          )
        }
        right={
          isShuffleDone && drawnCards.length > 0 ? (
            <SpreadRevealColumn
              spread={spread}
              drawnCards={drawnCards}
              isRevealingCompleted={isRevealingCompleted}
              onRevealAll={() => setIsRevealingCompleted(true)}
              onRevealingCompleted={() => setIsRevealingCompleted(true)}
              revealAllLabel={labels.revealAll}
              revealPromptLabel={labels.revealPrompt}
              allRevealedLabel={labels.allRevealed}
              gridLabel={labels.tabSpread}
              carouselLabel={labels.tabIndividual}
              positionLabel={labels.cardDetailPosition}
              cardLabel={labels.cardDetailCard}
              keywordsLabel={labels.cardDetailKeywords}
              reversedLabel={labels.cardDetailReversed}
            />
          ) : undefined
        }
      />
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
  const tReading = useTranslations("reading");
  const { data: session } = useSession();

  const {
    data: masterData,
    init: initMaster,
    tarotists,
    categories,
    spreads,
    isLoading,
  } = useMasterStore();
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
  const { refreshUsage, usage, clearReadings } = useClientStore();

  const handleReadingSaved = useCallback(async () => {
    clearReadings();
    await refreshUsage();
  }, [clearReadings, refreshUsage]);

  const [phase, setPhase] = useState<Phase>("selection");
  const [readingKey, setReadingKey] = useState(0);
  const [tarotistMode, setTarotistMode] = useState<"carousel" | "portrait">(
    selectedTarotist ? "portrait" : "carousel",
  );

  const token = (session as { accessToken?: string })?.accessToken ?? "";

  useEffect(() => {
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage]);

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
    setIsLocked(false);
    setReadingKey((k) => k + 1);
    setPhase("selection");
  };

  const handleHeaderBack = () => {
    resetSession();
    setIsLocked(false);
  };

  const remainingQuick = usage?.remainingReadings;
  const currentPlan = (usage?.plan as Plan | undefined) ?? null;

  // ─── Phase: reading ─────────────────────────────────────────
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
        onRefreshUsage={handleReadingSaved}
        labels={{
          backToHome: tCommon("backToHome"),
          remainingQuick:
            remainingQuick !== undefined
              ? tSalon("remainingQuick", { count: remainingQuick })
              : "",
          readAgain: t("readAgain"),
          limitReached: t("limitReached"),
          lockedDuringReading: tCommon("lockedDuringReading"),
          showSpread: tReading("showSpread"),
          hideSpread: tReading("hideSpread"),
          revealAll: tReading("revealAll"),
          revealPrompt: tReading("revealPrompt"),
          allRevealed: tReading("allRevealed"),
          tabSpread: tReading("tabSpread"),
          tabIndividual: tReading("tabIndividual"),
          cardDetailPosition: tReading("cardDetailPosition"),
          cardDetailCard: tReading("cardDetailCard"),
          cardDetailKeywords: tReading("cardDetailKeywords"),
          cardDetailReversed: tReading("cardDetailReversed"),
        }}
      />
    );
  }

  // ─── Phase: selection ───────────────────────────────────────
  return (
    <SelectionView
      isPersonal={false}
      tarotists={tarotists}
      selectedTarotist={selectedTarotist}
      onSelectTarotist={setQuickTarotist}
      onTarotistModeChange={setTarotistMode}
      currentPlan={currentPlan}
      categories={categories}
      spreads={spreads}
      selectedCategory={selectedCategory}
      selectedSpread={selectedSpread}
      remainingCount={remainingQuick}
      isLoading={isLoading}
      onQuickStartReading={handleStartReading}
      tarotistMode={tarotistMode}
      title={t("title")}
      backLabel={tCommon("backToHome")}
      remainingLabel={
        remainingQuick !== undefined
          ? tSalon("remainingQuick", { count: remainingQuick })
          : undefined
      }
      quickLabels={{
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
  );
}
