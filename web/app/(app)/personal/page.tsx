"use client";

import { CategorySpreadSelector } from "@shared/components/reading/category-spread-selector";
import { ChatView } from "@shared/components/chat/chat-view";
import { LowerViewer } from "@shared/components/tarot/lower-viewer";
import { RevealPromptPanel } from "@shared/components/reading/reveal-prompt-panel";
import { ShuffleDialog } from "@shared/components/reading/shuffle-dialog";
import { UpperViewer } from "@shared/components/tarot/upper-viewer";
import { TarotistCarouselPortrait } from "@/components/reading/tarotist-carousel-portrait";
import { useChatSession } from "@shared/hooks/use-chat-session";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useSalonStore } from "@/lib/client/stores/salon-store";
import { drawRandomCards } from "@/lib/client/services/draw-service";
import type { UIMessage } from "@ai-sdk/react";
import type { ReadingCategory, Spread, Tarotist } from "@shared/lib/types";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Phase = "selection" | "chat" | "reading";

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
  const tReading = useTranslations("reading");
  const { data: session } = useSession();

  const { data: masterData, init: initMaster, tarotists, categories, spreads, isLoading } =
    useMasterStore();
  const {
    personalTarotist: selectedTarotist,
    personalSpread: selectedSpread,
    drawnCards,
    isRevealingCompleted,
    setPersonalTarotist,
    setDrawnCards,
    setIsRevealingCompleted,
    resetSession,
  } = useSalonStore();
  const { refreshUsage, usage } = useClientStore();

  useEffect(() => {
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage]);

  const [phase, setPhase] = useState<Phase>("selection");
  const [phase1Messages, setPhase1Messages] = useState<UIMessage[]>([]);
  const [shuffleOpen, setShuffleOpen] = useState(false);
  const keyboardHeight = useKeyboardHeight();

  const token = (session as { accessToken?: string })?.accessToken ?? "";

  const canPersonal = usage == null || (usage.plan?.hasPersonal ?? false);
  const premiumTarotists = tarotists.filter((tarotist: Tarotist) => tarotist.plan?.code === "PREMIUM");

  const phase1Session = useChatSession(
    {
      api: "/api/readings/personal",
      token,
      isPersonal: true,
      isPhase2: false,
      tarotist: selectedTarotist!,
      spread: selectedSpread!,
      drawnCards: [],
      isRevealingCompleted: false,
    },
    {
      onRefreshUsage: refreshUsage,
      onRefreshToken: async () => token,
      onUnlock: () => {
        setPhase1Messages(phase1Session.messages);
        setShuffleOpen(true);
      },
      onMessagesChange: () => {},
    }
  );

  const phase2Session = useChatSession(
    {
      api: "/api/readings/personal",
      token,
      isPersonal: true,
      isPhase2: true,
      tarotist: selectedTarotist!,
      spread: selectedSpread!,
      drawnCards,
      isRevealingCompleted,
      initialMessages: phase1Messages,
    },
    {
      onRefreshUsage: refreshUsage,
      onRefreshToken: async () => token,
      onUnlock: () => {},
    }
  );

  useEffect(() => {
    if (!shuffleOpen || drawnCards.length > 0 || !masterData || !selectedSpread) return;
    const cards = drawRandomCards(masterData, selectedSpread);
    setDrawnCards(cards);
    setShuffleOpen(false);
  }, [shuffleOpen, drawnCards.length, masterData, selectedSpread, setDrawnCards]);

  const handleShuffleComplete = () => {
    setTimeout(() => setIsRevealingCompleted(true), 500);
    setPhase("reading");
  };

  const handleStartPersonal = ({
    category,
    spread,
  }: { category: ReadingCategory | null; spread: Spread }) => {
    useSalonStore.getState().setPersonalSpread(spread);
    useSalonStore.getState().setPersonalCategory(category);
    resetSession();
    setPhase("chat");
  };

  const readingRef = useRef(false);
  useEffect(() => {
    if (phase === "reading" && drawnCards.length > 0 && !readingRef.current) {
      readingRef.current = true;
    }
  }, [phase, drawnCards]);

  const remainingPersonal = usage?.remainingPersonal;
  const currentPlan = usage?.plan as Parameters<typeof CategorySpreadSelector>[0]["currentPlan"];

  // ── Phase 0: タロティスト + スプレッド選択 ──
  if (phase === "selection") {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        {/* ヘッダー */}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* プレミアム占い師選択 */}
            <div
              className="bg-white/50 rounded-2xl border shadow-sm overflow-hidden"
              style={{ height: "600px" }}
            >
              <TarotistCarouselPortrait
                tarotists={premiumTarotists}
                selectedTarotist={selectedTarotist}
                onSelect={setPersonalTarotist}
                currentPlan={usage?.plan ?? null}
              />
            </div>

            {/* スプレッド選択 */}
            <div className="bg-white rounded-2xl shadow-sm border p-4">
              <CategorySpreadSelector
                categories={categories}
                spreads={spreads}
                currentPlan={currentPlan}
                isPersonal={true}
                remainingCount={remainingPersonal}
                disabled={!selectedTarotist}
                onStartReading={handleStartPersonal}
                labels={{
                  selectSpreadPrompt: tSalon("selectSpread"),
                  selectCategoryAndSpreadPrompt: tSalon("selectCategoryAndSpread"),
                  categoryLabel: tSalon("categoryLabel"),
                  spreadLabel: tSalon("spreadLabel"),
                  selectPlaceholder: tSalon("selectPlaceholder"),
                  categoryQuestion: tSalon("categoryQuestion"),
                  spreadQuestion: tSalon("spreadQuestion"),
                  spreadSubtitle: tSalon("spreadSubtitle"),
                  startReading: t("startPersonal"),
                  limitReached: tSalon("limitReached"),
                  remainingText:
                    remainingPersonal !== undefined && remainingPersonal > 0
                      ? tSalon("remainingToday", { count: remainingPersonal })
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

  if (!selectedSpread || !selectedTarotist) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">{t("selectTarotistAndSpread")}</p>
        <button
          onClick={() => setPhase("selection")}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg"
        >
          {tCommon("back")}
        </button>
      </div>
    );
  }

  const tarotistImageUrl = `/tarotists/${selectedTarotist.name}.png`;

  // ── Phase 1: チャット ──
  if (phase === "chat") {
    return (
      <div className="flex flex-col h-[100dvh] -m-4 md:-m-6">
        {/* ヘッダー */}
        <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => { resetSession(); setPhase("selection"); }}
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors"
            >
              <ArrowLeft size={16} />
              {tCommon("back")}
            </button>
            {remainingPersonal !== undefined && (
              <span className="text-xs bg-pink-50 text-pink-700 px-3 py-1 rounded-full border border-pink-100">
                {t("remainingPersonal", { count: remainingPersonal })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 border-purple-200 shadow-md">
              <img
                src={tarotistImageUrl}
                alt={selectedTarotist.name}
                className="w-full h-full object-cover"
                style={{ objectPosition: "center 20%" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-purple-700 to-indigo-800 flex items-center justify-center text-xl text-white -z-10">
                {selectedTarotist.icon}
              </div>
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">
                {selectedTarotist.name}
              </h2>
              <p className="text-sm text-purple-600 font-medium">{t("phase1Title")}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t("phase1Desc")}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatView
            messages={phase1Session.messages}
            status={phase1Session.status}
            inputValue={phase1Session.inputValue}
            onInputChange={phase1Session.handleInputChange}
            onSend={phase1Session.handleSend}
            phase2Stage={phase1Session.phase2Stage}
            questionsRemaining={phase1Session.questionsRemaining}
            isMessageComplete={false}
            keyboardOffset={keyboardHeight}
            tarotistImageUrl={tarotistImageUrl}
            tarotistIcon={selectedTarotist.icon}
          />
        </div>
      </div>
    );
  }

  // ── Phase 2: リーディング ──
  const selectorContent = (
    <RevealPromptPanel
      isAllRevealed={isRevealingCompleted}
      onRevealAll={() => setIsRevealingCompleted(true)}
    />
  );

  const personalContent = (
    <ChatView
      messages={phase2Session.messages}
      status={phase2Session.status}
      inputValue={phase2Session.inputValue}
      onInputChange={phase2Session.handleInputChange}
      onSend={phase2Session.handleSend}
      onEndReading={phase2Session.handleSessionClose}
      phase2Stage={phase2Session.phase2Stage}
      questionsRemaining={phase2Session.questionsRemaining}
      isMessageComplete={phase2Session.isMessageComplete}
      keyboardOffset={keyboardHeight}
      tarotistImageUrl={tarotistImageUrl}
      tarotistIcon={selectedTarotist.icon}
    />
  );

  return (
    <>
      <ShuffleDialog
        isOpen={shuffleOpen}
        onComplete={handleShuffleComplete}
        cardBackPath="/cards/back.png"
      />
      <div className="flex flex-col h-[100dvh] -m-4 md:-m-6">
        {/* ヘッダー */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-purple-100">
          <button
            type="button"
            onClick={() => { resetSession(); setPhase("selection"); }}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors"
          >
            <ArrowLeft size={16} />
            {tCommon("back")}
          </button>
          <span className="text-xs text-pink-600 font-medium">{t("phase2Title")}</span>
        </div>
        <div className="flex-shrink-0" style={{ height: "40vh" }}>
          <UpperViewer
            spread={selectedSpread}
            drawnCards={drawnCards}
            isRevealingCompleted={isRevealingCompleted}
            onRevealingCompleted={() => setIsRevealingCompleted(true)}
            tarotistImageUrl={tarotistImageUrl}
            tarotistName={selectedTarotist.name}
            cardBasePath="/cards"
          />
        </div>
        <div className="flex-1 overflow-hidden">
          <LowerViewer
            selectorContent={selectorContent}
            personalContent={personalContent}
            defaultMode="personal"
            selectorLabel={tReading("tabCards")}
            personalLabel={tReading("tabChat")}
          />
        </div>
      </div>
    </>
  );
}
