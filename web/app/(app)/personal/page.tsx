"use client";

import { CategorySpreadSelector } from "@shared/components/reading/category-spread-selector";
import { ChatView } from "@shared/components/chat/chat-view";
import { ShuffleDialog } from "@shared/components/reading/shuffle-dialog";
import { UpperViewer, type UpperViewerTab } from "@shared/components/tarot/upper-viewer";
import { TarotistCarouselPortrait } from "@/components/reading/tarotist-carousel-portrait";
import { useChatSession } from "@shared/hooks/use-chat-session";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useSalonStore } from "@/lib/client/stores/salon-store";
import { drawRandomCards } from "@/lib/client/services/draw-service";
import type { UIMessage } from "@ai-sdk/react";
import type { ReadingCategory, Spread, Tarotist } from "@shared/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, ChevronDown, RefreshCw } from "lucide-react";

type Phase = "tarotist" | "chat" | "reading";

const SPREAD_VIEW_DISPLAY_MS = 2000;

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const onResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      setHeight(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    };
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
    };
  }, []);
  return height;
}

export default function PersonalPage() {
  const t = useTranslations("personal");
  const tCommon = useTranslations("common");
  const tSalon = useTranslations("salon");
  const { data: session } = useSession();

  const { data: masterData, init: initMaster, tarotists, categories, spreads, isLoading } =
    useMasterStore();
  const {
    personalTarotist: selectedTarotist,
    personalSpread: selectedSpread,
    drawnCards,
    isRevealingCompleted,
    setPersonalTarotist,
    setPersonalSpread,
    setPersonalCategory,
    setDrawnCards,
    setIsRevealingCompleted,
    resetSession,
  } = useSalonStore();
  const { refreshUsage, usage } = useClientStore();

  useEffect(() => {
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage]);

  const [phase, setPhase] = useState<Phase>("tarotist");
  const [phase1Messages, setPhase1Messages] = useState<UIMessage[]>([]);
  const [upperTab, setUpperTab] = useState<UpperViewerTab>("grid");
  const [isTopCollapsed, setIsTopCollapsed] = useState(false);
  const keyboardHeight = useKeyboardHeight();

  const token = (session as { accessToken?: string })?.accessToken ?? "";

  const canPersonal = usage == null || (usage.plan?.hasPersonal ?? false);
  const premiumTarotists = tarotists.filter(
    (tarotist: Tarotist) => tarotist.plan?.code === "PREMIUM",
  );

  // ─── Phase1 ChatSession ────────────────────────────────────────
  const phase1Session = useChatSession(
    {
      api: "/api/readings/personal",
      token,
      isPersonal: true,
      isPhase2: false,
      tarotist: selectedTarotist!,
      // スプレッドは Phase1 では未確定。AI リーディングリクエストには同梱しなくてよい
      // （サーバー側で Phase2 まで必要ない）
      spread: selectedSpread as Spread,
      drawnCards: [],
      isRevealingCompleted: false,
    },
    {
      onRefreshUsage: refreshUsage,
      onRefreshToken: async () => token,
      onUnlock: () => {},
      onMessagesChange: setPhase1Messages,
      onPhase1SpreadSuggested: (suggestion) => {
        // 推薦スプレッドを salon-store に事前セット（CategorySpreadSelector の初期選択に反映）
        if (!masterData) return;
        const matched = masterData.spreads?.find(
          (s) =>
            (suggestion.spreadNo !== undefined && s.no === suggestion.spreadNo) ||
            (suggestion.spreadName && s.name === suggestion.spreadName),
        );
        if (matched) setPersonalSpread(matched);
      },
    },
  );

  // ─── Phase2 ChatSession (Phase1 → Phase2 引き継ぎ) ─────────────
  const phase2Session = useChatSession(
    {
      api: "/api/readings/personal",
      token,
      isPersonal: true,
      isPhase2: true,
      tarotist: selectedTarotist!,
      spread: selectedSpread as Spread,
      drawnCards,
      isRevealingCompleted,
      initialMessages: phase1Messages,
    },
    {
      onRefreshUsage: refreshUsage,
      onRefreshToken: async () => token,
      onUnlock: () => {},
    },
  );

  // Phase2 突入時にカード配布
  useEffect(() => {
    if (phase !== "reading") return;
    if (!masterData || !selectedSpread) return;
    if (drawnCards.length > 0) return;
    const cards = drawRandomCards(masterData, selectedSpread);
    setDrawnCards(cards);
  }, [phase, masterData, selectedSpread, drawnCards.length, setDrawnCards]);

  // Phase2 カードを自動で全枚めくる
  useEffect(() => {
    if (phase !== "reading" || drawnCards.length === 0) return;
    const timer = setTimeout(() => setIsRevealingCompleted(true), 500);
    return () => clearTimeout(timer);
  }, [phase, drawnCards.length, setIsRevealingCompleted]);

  // 全カードめくり完了 → SPREAD_VIEW_DISPLAY_MS 後にプロフィールへ切替
  useEffect(() => {
    if (phase !== "reading" || !isRevealingCompleted) return;
    const timer = setTimeout(
      () => setUpperTab("profile"),
      SPREAD_VIEW_DISPLAY_MS,
    );
    return () => clearTimeout(timer);
  }, [phase, isRevealingCompleted]);

  const handleStartPhase1 = () => {
    if (!selectedTarotist) return;
    setPhase1Messages([]);
    setPhase("chat");
    setIsTopCollapsed(false);
  };

  const handleConfirmSpread = ({
    category,
    spread,
  }: {
    category: ReadingCategory | null;
    spread: Spread;
  }) => {
    setPersonalSpread(spread);
    setPersonalCategory(category);
    setPhase("reading");
    setUpperTab("grid");
  };

  const handleReadAgain = () => {
    resetSession();
    setPhase1Messages([]);
    setPhase("chat");
    setUpperTab("grid");
    setIsTopCollapsed(false);
  };

  const handleHeaderBack = () => {
    // 仕様: ヘッダー「戻る」→ `/`
    resetSession();
    setPhase1Messages([]);
  };

  const remainingPersonal = usage?.remainingPersonal;
  const currentPlan = usage?.plan as Parameters<typeof CategorySpreadSelector>[0]["currentPlan"];

  // ═════════════════════════════════════════════════════════════
  // Phase 0: タロティスト選択
  // ═════════════════════════════════════════════════════════════
  if (phase === "tarotist") {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors"
          >
            <ArrowLeft size={16} />
            {tCommon("backToHome")}
          </Link>
          {remainingPersonal !== undefined && canPersonal && (
            <span className="text-xs bg-pink-50 text-pink-700 px-3 py-1 rounded-full border border-pink-100">
              {tSalon("remainingPersonal", { count: remainingPersonal })}
            </span>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-800">{t("title")}</h1>
        <p className="text-sm text-gray-500">{t("tarotistPrompt")}</p>

        {!canPersonal ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400 mb-4">{t("premiumOnly")}</p>
            <Link
              href="/plans"
              className="inline-block px-5 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow hover:opacity-90 transition-opacity"
            >
              {tSalon("upgradeAction")}
            </Link>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-4 border-purple-300 border-t-purple-600 animate-spin" />
          </div>
        ) : (
          <>
            <div
              className="bg-white/50 rounded-2xl border shadow-sm overflow-hidden"
              style={{ height: "600px" }}
            >
              <TarotistCarouselPortrait
                tarotists={premiumTarotists}
                selectedTarotist={selectedTarotist}
                onSelect={setPersonalTarotist}
                currentPlan={
                  (usage?.plan as Parameters<typeof TarotistCarouselPortrait>[0]["currentPlan"]) ??
                  null
                }
              />
            </div>
            <div className="px-1 pb-2">
              <button
                type="button"
                onClick={handleStartPhase1}
                disabled={
                  !selectedTarotist ||
                  (remainingPersonal !== undefined && remainingPersonal <= 0)
                }
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg shadow-2xl hover:from-purple-600 hover:to-pink-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {t("startChat")}
              </button>
              {remainingPersonal !== undefined && remainingPersonal <= 0 && (
                <div className="text-center text-xs text-black bg-purple-200/50 rounded-lg px-2 py-1 mt-2">
                  {tSalon("limitReached")}
                </div>
              )}
              {!selectedTarotist && (
                <div className="text-center text-xs text-gray-500 mt-2">
                  {t("selectTarotistFirst")}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  if (!selectedTarotist) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">{t("selectTarotistFirst")}</p>
        <button
          onClick={() => setPhase("tarotist")}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg"
        >
          {tCommon("back")}
        </button>
      </div>
    );
  }

  const tarotistImageUrl = `/tarotists/${selectedTarotist.name}.png`;

  // ═════════════════════════════════════════════════════════════
  // Phase 1: チャット (上半分: 肖像画 [アコーディオン可] / 下半分: ChatView)
  // ═════════════════════════════════════════════════════════════
  if (phase === "chat") {
    const showSelectorOverlay =
      phase1Session.phase1Stage === "spread-selection";

    return (
      <div className="flex flex-col h-[100dvh] -m-4 md:-m-6">
        {/* ヘッダー */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-purple-100">
          <Link
            href="/"
            onClick={handleHeaderBack}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors"
          >
            <ArrowLeft size={16} />
            {tCommon("backToHome")}
          </Link>
          {remainingPersonal !== undefined && (
            <span className="text-xs bg-pink-50 text-pink-700 px-3 py-1 rounded-full border border-pink-100">
              {tSalon("remainingPersonal", { count: remainingPersonal })}
            </span>
          )}
        </div>

        {/* 上半分: タロティスト肖像画（折りたたみ可） */}
        <motion.div
          className="flex-shrink-0 overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50"
          animate={{ height: isTopCollapsed ? 0 : "40vh" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="h-full p-3">
            <div className="h-full rounded-3xl overflow-hidden shadow-xl relative">
              <img
                src={tarotistImageUrl}
                alt={selectedTarotist.name}
                className="w-full h-full object-cover"
                style={{ objectPosition: "center 20%" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white">
                <p className="font-bold text-base">{selectedTarotist.name}</p>
                <p className="text-xs opacity-90">{t("phase1Title")}</p>
              </div>
            </div>
          </div>
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

        {/* 下半分: ChatView または CategorySpreadSelector */}
        <div className="flex-1 overflow-hidden relative">
          <ChatView
            messages={phase1Session.messages}
            status={phase1Session.status}
            inputValue={phase1Session.inputValue}
            onInputChange={phase1Session.handleInputChange}
            onSend={phase1Session.handleSend}
            onKeyDown={phase1Session.handleKeyDown}
            inputDisabled={
              phase1Session.inputDisabled || showSelectorOverlay
            }
            keyboardOffset={keyboardHeight}
            tarotistImageUrl={tarotistImageUrl}
            tarotistIcon={selectedTarotist.icon}
            error={phase1Session.error}
            onRetry={phase1Session.handleRetry}
          />

          {/* スプレッド確定 overlay */}
          <AnimatePresence>
            {showSelectorOverlay && (
              <motion.div
                key="spread-selector"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 280, damping: 30 }}
                className="absolute inset-0 bg-white overflow-y-auto"
              >
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-purple-100 px-4 py-3 z-10">
                  <p className="text-sm font-semibold text-purple-700">
                    {t("confirmSpreadTitle")}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t("confirmSpreadDesc")}
                  </p>
                </div>
                <div className="p-4">
                  <CategorySpreadSelector
                    categories={categories}
                    spreads={spreads}
                    currentPlan={currentPlan}
                    isPersonal={true}
                    remainingCount={remainingPersonal}
                    disabled={false}
                    onStartReading={handleConfirmSpread}
                    labels={{
                      selectSpreadPrompt: t("confirmSpreadPrompt"),
                      spreadLabel: tSalon("spreadLabel"),
                      selectPlaceholder: tSalon("selectPlaceholder"),
                      spreadQuestion: tSalon("spreadQuestion"),
                      spreadSubtitle: tSalon("spreadSubtitle"),
                      startReading: t("startReading"),
                      limitReached: tSalon("limitReached"),
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // Phase 2: リーディング
  // ═════════════════════════════════════════════════════════════
  const phase2Done = phase2Session.phase2Stage === "done";
  const canReadAgain = remainingPersonal === undefined || remainingPersonal > 0;

  return (
    <>
      <ShuffleDialog
        isOpen={drawnCards.length === 0}
        onComplete={() => {}}
        cardBackPath="/cards/back.png"
      />

      <div className="flex flex-col h-[100dvh] -m-4 md:-m-6">
        {/* ヘッダー */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-purple-100">
          <Link
            href="/"
            onClick={handleHeaderBack}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors"
          >
            <ArrowLeft size={16} />
            {tCommon("backToHome")}
          </Link>
          <span className="text-xs text-pink-600 font-medium">
            {t("phase2Title")}
          </span>
        </div>

        {/* 上半分: UpperViewer（折りたたみ可） */}
        <motion.div
          className="flex-shrink-0 overflow-hidden"
          animate={{ height: isTopCollapsed ? 0 : "40vh" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {drawnCards.length > 0 && selectedSpread && (
            <UpperViewer
              spread={selectedSpread}
              drawnCards={drawnCards}
              isRevealingCompleted={isRevealingCompleted}
              onRevealingCompleted={() => setIsRevealingCompleted(true)}
              tarotistImageUrl={tarotistImageUrl}
              tarotistName={selectedTarotist.name}
              cardBasePath="/cards"
              activeTab={upperTab}
              onActiveTabChange={setUpperTab}
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

        {/* 下半分: ChatView Phase2 */}
        <div className="flex-1 overflow-hidden relative">
          <ChatView
            messages={phase2Session.messages}
            status={phase2Session.status}
            inputValue={phase2Session.inputValue}
            onInputChange={phase2Session.handleInputChange}
            onSend={phase2Session.handleSend}
            onKeyDown={phase2Session.handleKeyDown}
            onEndReading={phase2Session.handleSessionClose}
            isPhase2={true}
            phase2Stage={phase2Session.phase2Stage}
            questionsRemaining={phase2Session.questionsRemaining}
            isMessageComplete={phase2Session.isMessageComplete}
            inputDisabled={phase2Session.inputDisabled}
            keyboardOffset={keyboardHeight}
            tarotistImageUrl={tarotistImageUrl}
            tarotistIcon={selectedTarotist.icon}
            error={phase2Session.error}
            onRetry={phase2Session.handleRetry}
            sessionEndedLabel={t("sessionEndedLabel")}
            sessionEndedSubLabel={t("sessionEndedSubLabel")}
          />

          {/* クロージング完了後のアクション */}
          {phase2Done && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-40 pointer-events-none">
              {canReadAgain ? (
                <button
                  type="button"
                  onClick={handleReadAgain}
                  className="pointer-events-auto flex items-center gap-2 px-5 py-3 bg-white shadow-xl rounded-full text-sm font-bold text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <RefreshCw size={14} />
                  {t("readAgain")}
                </button>
              ) : (
                <div className="pointer-events-auto px-5 py-3 bg-gray-100 rounded-full text-sm font-medium text-gray-400">
                  {t("limitReached")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
