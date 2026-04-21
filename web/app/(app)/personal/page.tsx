"use client";

import { CategorySpreadSelector } from "@shared/components/reading/category-spread-selector";
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
  MasterData,
  Plan,
  ReadingCategory,
  Spread,
  Tarotist,
} from "@shared/lib/types";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

type Phase = "selection" | "chat";

// ─────────────────────────────────────────────────────────────
// PersonalReadingView — 単一セッション。
// chat 突入後は useReadingChat 1 インスタンスで Phase1→Phase2 連続運用。
// 右カラムはスプレッド確定＋カード配布後に現れ、裏面→めくり→Phase2 へ。
// ─────────────────────────────────────────────────────────────

interface PersonalReadingViewProps {
  tarotist: Tarotist;
  masterData: MasterData;
  currentPlan: Plan | null;
  categories: ReadingCategory[];
  spreads: Spread[];
  token: string;
  remainingPersonal: number | undefined;
  onReadAgain: () => void;
  onHeaderBack: () => void;
  onRefreshUsage: () => Promise<void>;
  labels: {
    backToHome: string;
    lockedDuringReading: string;
    remainingPersonal: string;
    phase1Subtitle: string;
    phase2Subtitle: string;
    confirmSpreadPrompt: string;
    spreadLabel: string;
    selectPlaceholder: string;
    spreadQuestion: string;
    spreadSubtitle: string;
    startReading: string;
    limitReached: string;
    readAgain: string;
    sessionEndedLabel: string;
    sessionEndedSubLabel: string;
    showSpread: string;
    hideSpread: string;
    revealAll: string;
    revealPrompt: string;
    allRevealed: string;
  };
}

function PersonalReadingView({
  tarotist,
  masterData,
  currentPlan,
  categories,
  spreads,
  token,
  remainingPersonal,
  onReadAgain,
  onHeaderBack,
  onRefreshUsage,
  labels,
}: PersonalReadingViewProps) {
  const {
    personalSpread: selectedSpread,
    setPersonalSpread,
    setPersonalCategory,
    drawnCards,
    isRevealingCompleted,
    isLocked,
    setDrawnCards,
    setIsRevealingCompleted,
    setIsLocked,
  } = useSalonStore();

  const [rightVisible, setRightVisible] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isShuffleDone, setIsShuffleDone] = useState(false);
  // AI 推薦スプレッド（salon-store に即 commit せず、ユーザー確定まで保持）。
  // 即 commit すると useReadingChat の deriveStage が "spread-suggest" → "awaiting-draw"
  // に進んで、スプレッド選択 UI が一瞬で消えてしまうため。
  const [suggestedSpread, setSuggestedSpread] = useState<Spread | null>(null);
  const onRefreshToken = useCallback(async () => token, [token]);

  const {
    messages,
    status,
    stage,
    inputValue,
    inputDisabled,
    isMessageComplete,
    questionsRemaining,
    error,
    handleInputChange,
    handleSend,
    handleKeyDown,
    handleSessionClose,
    handleRetry,
  } = useReadingChat(
    {
      api: "/api/readings/personal",
      token,
      isPersonal: true,
      tarotist,
      spread: selectedSpread,
      drawnCards,
      isRevealingCompleted,
    },
    {
      onRefreshUsage,
      onRefreshToken,
      onUnlock: () => setIsLocked(false),
      onSpreadSuggested: (suggestion) => {
        // AI 推薦をローカル state に保持（salon-store へは commit しない）。
        // CategorySpreadSelector の initialSpread としてデフォルト選択に反映させる。
        // ユーザーが「占いを始める」で確定したタイミングで初めて salon-store に書く。
        const matched = masterData.spreads?.find(
          (s) =>
            (suggestion.spreadNo !== undefined && s.no === suggestion.spreadNo) ||
            (suggestion.spreadName && s.name === suggestion.spreadName),
        );
        if (matched) setSuggestedSpread(matched);
      },
    },
  );

  // スプレッド確定ハンドラー → シャッフル開始
  const handleConfirmSpread = useCallback(
    ({
      category,
      spread,
    }: {
      category: ReadingCategory | null;
      spread: Spread;
    }) => {
      setPersonalSpread(spread);
      setPersonalCategory(category);
      setIsLocked(true);
      setIsShuffling(true);
    },
    [setPersonalSpread, setPersonalCategory, setIsLocked],
  );

  // シャッフル完了後にカード配布
  const handleShuffleComplete = useCallback(() => {
    setIsShuffling(false);
    setIsShuffleDone(true);
    if (selectedSpread && drawnCards.length === 0) {
      const cards = drawRandomCards(masterData, selectedSpread);
      setDrawnCards(cards);
    }
  }, [selectedSpread, drawnCards.length, masterData, setDrawnCards]);

  // ナビゲーションロック解除（エラー時・クロージング完了時の安全網）
  useEffect(() => {
    if ((stage === "done" || error) && !isLocked) return;
    if (stage === "done" || error) setIsLocked(false);
  }, [stage, error, isLocked, setIsLocked]);

  // アンマウント時の安全網
  useEffect(() => {
    return () => setIsLocked(false);
  }, [setIsLocked]);

  const tarotistImageUrl = `/tarotists/${tarotist.name}.png`;
  const isPhase2Phase = messages.length >= 5;
  const subtitle = isPhase2Phase ? labels.phase2Subtitle : labels.phase1Subtitle;
  const canReadAgain =
    remainingPersonal === undefined || remainingPersonal > 0;

  // 右カラムのマウント条件: スプレッド確定済 & カード配布済 & シャッフル完了済
  const showRight =
    selectedSpread != null &&
    drawnCards.length > 0 &&
    isShuffleDone;

  // chat footer: Phase1 スプレッド提案後、まだ未確定のとき CategorySpreadSelector 表示
  const showSelectorInline =
    stage === "spread-suggest" && !isShuffling && !isShuffleDone;

  return (
    <>
      <ShuffleDialog
        isOpen={isShuffling}
        onComplete={handleShuffleComplete}
        cardBackPath="/cards/back.png"
      />

      <TwoColumnReadingLayout
        isLocked={isLocked}
        onHeaderBack={onHeaderBack}
        backLabel={labels.backToHome}
        lockedLabel={labels.lockedDuringReading}
        rightVisible={rightVisible && showRight}
        onToggleRight={() => setRightVisible((v) => !v)}
        showSpreadLabel={labels.showSpread}
        hideSpreadLabel={labels.hideSpread}
        headerRight={
          remainingPersonal !== undefined ? (
            <span className="text-xs bg-pink-50 text-pink-700 px-3 py-1 rounded-full border border-pink-100">
              {labels.remainingPersonal}
            </span>
          ) : null
        }
        left={
          <div className="relative h-full">
            <ChatColumn
              tarotistImageUrl={tarotistImageUrl}
              tarotistName={tarotist.name}
              tarotistIcon={tarotist.icon}
              subtitle={subtitle}
              messages={messages}
              status={status}
              inputValue={inputValue}
              onInputChange={handleInputChange}
              onSend={handleSend}
              onKeyDown={handleKeyDown}
              inputDisabled={inputDisabled}
              isPhase2={isPhase2Phase}
              phase2Stage={stage === "done" ? "done" : "chatting"}
              questionsRemaining={
                isPhase2Phase ? questionsRemaining : undefined
              }
              isMessageComplete={isMessageComplete}
              onEndReading={handleSessionClose}
              error={error}
              onRetry={handleRetry}
              sessionEndedLabel={labels.sessionEndedLabel}
              sessionEndedSubLabel={labels.sessionEndedSubLabel}
              footer={
                showSelectorInline ? (
                  <div className="mt-4 border-t border-purple-100 pt-4">
                    <CategorySpreadSelector
                      categories={categories}
                      spreads={spreads}
                      currentPlan={currentPlan}
                      isPersonal
                      remainingCount={remainingPersonal}
                      disabled={false}
                      initialSpread={suggestedSpread}
                      onStartReading={handleConfirmSpread}
                      labels={{
                        selectSpreadPrompt: labels.confirmSpreadPrompt,
                        spreadLabel: labels.spreadLabel,
                        selectPlaceholder: labels.selectPlaceholder,
                        spreadQuestion: labels.spreadQuestion,
                        spreadSubtitle: labels.spreadSubtitle,
                        startReading: labels.startReading,
                        limitReached: labels.limitReached,
                      }}
                    />
                  </div>
                ) : null
              }
            />

            {/* クロージング完了後のアクション */}
            {stage === "done" && !error && (
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
        }
        right={
          showRight && selectedSpread ? (
            <SpreadRevealColumn
              spread={selectedSpread}
              drawnCards={drawnCards}
              isRevealingCompleted={isRevealingCompleted}
              onRevealAll={() => setIsRevealingCompleted(true)}
              onRevealingCompleted={() => setIsRevealingCompleted(true)}
              revealAllLabel={labels.revealAll}
              revealPromptLabel={labels.revealPrompt}
              allRevealedLabel={labels.allRevealed}
            />
          ) : undefined
        }
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// PersonalPage — オーケストレーター
// ─────────────────────────────────────────────────────────────

export default function PersonalPage() {
  const t = useTranslations("personal");
  const tCommon = useTranslations("common");
  const tSalon = useTranslations("salon");
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
    personalTarotist: selectedTarotist,
    setPersonalTarotist,
    resetSession,
    setIsLocked,
  } = useSalonStore();
  const { refreshUsage, usage, clearReadings } = useClientStore();

  useEffect(() => {
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage]);

  const handleReadingSaved = useCallback(async () => {
    clearReadings();
    await refreshUsage();
  }, [clearReadings, refreshUsage]);

  const [phase, setPhase] = useState<Phase>("selection");
  const [sessionKey, setSessionKey] = useState(0);

  const token = (session as { accessToken?: string })?.accessToken ?? "";

  const canPersonal = usage == null || (usage.plan?.hasPersonal ?? false);
  const premiumTarotists = useMemo(
    () => tarotists.filter((tar: Tarotist) => tar.plan?.code === "PREMIUM"),
    [tarotists],
  );

  const currentPlan = (usage?.plan as Plan | undefined) ?? null;
  const remainingPersonal = usage?.remainingPersonal;

  const handleStartChat = () => {
    if (!selectedTarotist) return;
    resetSession();
    setPhase("chat");
  };

  const handleReadAgain = () => {
    resetSession();
    setSessionKey((k) => k + 1);
    setPhase("selection");
  };

  const handleHeaderBack = () => {
    resetSession();
    setIsLocked(false);
  };

  // ─── Phase: chat ────────────────────────────────────────────
  if (phase === "chat" && selectedTarotist && masterData) {
    return (
      <PersonalReadingView
        key={sessionKey}
        tarotist={selectedTarotist}
        masterData={masterData}
        currentPlan={currentPlan}
        categories={categories}
        spreads={spreads}
        token={token}
        remainingPersonal={remainingPersonal}
        onReadAgain={handleReadAgain}
        onHeaderBack={handleHeaderBack}
        onRefreshUsage={handleReadingSaved}
        labels={{
          backToHome: tCommon("backToHome"),
          lockedDuringReading: tCommon("lockedDuringReading"),
          remainingPersonal:
            remainingPersonal !== undefined
              ? tSalon("remainingPersonal", { count: remainingPersonal })
              : "",
          phase1Subtitle: t("phase1Title"),
          phase2Subtitle: t("phase2Title"),
          confirmSpreadPrompt: t("confirmSpreadPrompt"),
          spreadLabel: tSalon("spreadLabel"),
          selectPlaceholder: tSalon("selectPlaceholder"),
          spreadQuestion: tSalon("spreadQuestion"),
          spreadSubtitle: tSalon("spreadSubtitle"),
          startReading: t("startReading"),
          limitReached: tSalon("limitReached"),
          readAgain: t("readAgain"),
          sessionEndedLabel: t("sessionEndedLabel"),
          sessionEndedSubLabel: t("sessionEndedSubLabel"),
          showSpread: tReading("showSpread"),
          hideSpread: tReading("hideSpread"),
          revealAll: tReading("revealAll"),
          revealPrompt: tReading("revealPrompt"),
          allRevealed: tReading("allRevealed"),
        }}
      />
    );
  }

  // ─── Phase: selection ───────────────────────────────────────
  return (
    <SelectionView
      isPersonal
      tarotists={premiumTarotists}
      selectedTarotist={selectedTarotist}
      onSelectTarotist={setPersonalTarotist}
      currentPlan={currentPlan}
      remainingCount={remainingPersonal}
      isLoading={isLoading}
      onPersonalStartChat={handleStartChat}
      title={t("title")}
      subtitle={t("tarotistPrompt")}
      backLabel={tCommon("backToHome")}
      remainingLabel={
        canPersonal && remainingPersonal !== undefined
          ? tSalon("remainingPersonal", { count: remainingPersonal })
          : undefined
      }
      personalLabels={{
        startChat: t("startChat"),
        limitReached: tSalon("limitReached"),
        selectTarotistFirst: t("selectTarotistFirst"),
        premiumOnly: t("premiumOnly"),
        upgradeAction: tSalon("upgradeAction"),
        canPersonal,
      }}
    />
  );
}
