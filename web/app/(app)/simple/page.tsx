"use client";

import { CategorySpreadSelector } from "@shared/components/reading/category-spread-selector";
import { ShuffleDialog } from "@shared/components/reading/shuffle-dialog";
import { UpperViewer, type UpperViewerTab } from "@shared/components/tarot/upper-viewer";
import { TarotistCarouselPortrait } from "@/components/reading/tarotist-carousel-portrait";
import { useChatSession } from "@shared/hooks/use-chat-session";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useSalonStore } from "@/lib/client/stores/salon-store";
import { drawRandomCards } from "@/lib/client/services/draw-service";
import type { ReadingCategory, Spread } from "@shared/lib/types";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, RefreshCw } from "lucide-react";

type Phase = "selection" | "reading";

const SPREAD_VIEW_DISPLAY_MS = 2000;

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
    drawnCards,
    isRevealingCompleted,
    setQuickTarotist,
    setDrawnCards,
    setIsRevealingCompleted,
    resetSession,
  } = useSalonStore();
  const { refreshUsage, usage } = useClientStore();

  const [phase, setPhase] = useState<Phase>("selection");
  const [isReady, setIsReady] = useState(false);
  const [upperTab, setUpperTab] = useState<UpperViewerTab>("grid");
  const [isTopCollapsed, setIsTopCollapsed] = useState(false);

  const token = (session as { accessToken?: string })?.accessToken ?? "";

  useEffect(() => {
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage]);

  useEffect(() => {
    if (!masterData || !selectedSpread || drawnCards.length > 0) return;
    if (phase !== "reading") return;
    const cards = drawRandomCards(masterData, selectedSpread);
    setDrawnCards(cards);
  }, [phase, masterData, selectedSpread, drawnCards.length, setDrawnCards]);

  const {
    messages,
    status,
    questionsRemaining: _qr,
    isMessageComplete,
  } = useChatSession(
    {
      api: "/api/readings/simple",
      token,
      isPersonal: false,
      isPhase2: false,
      tarotist: selectedTarotist!,
      spread: selectedSpread!,
      category: selectedCategory ?? undefined,
      drawnCards,
      isRevealingCompleted,
    },
    {
      onRefreshUsage: refreshUsage,
      onRefreshToken: async () => token,
      onUnlock: () => {},
    },
  );
  void _qr;

  const handleStartReading = ({
    category,
    spread,
  }: {
    category: ReadingCategory | null;
    spread: Spread;
  }) => {
    useSalonStore.getState().setQuickSpread(spread);
    useSalonStore.getState().setQuickCategory(category);
    resetSession();
    setPhase("reading");
    setIsReady(false);
    setUpperTab("grid");
  };

  const handleShuffleComplete = () => {
    setIsReady(true);
    setTimeout(() => setIsRevealingCompleted(false), 100);
  };

  // 全カードめくり完了 → SPREAD_VIEW_DISPLAY_MS 後にプロフィールへ
  useEffect(() => {
    if (phase !== "reading" || !isRevealingCompleted) return;
    const timer = setTimeout(
      () => setUpperTab("profile"),
      SPREAD_VIEW_DISPLAY_MS,
    );
    return () => clearTimeout(timer);
  }, [phase, isRevealingCompleted]);

  const handleReadAgain = () => {
    resetSession();
    setPhase("selection");
    setIsReady(false);
    setUpperTab("grid");
  };

  const remainingQuick = usage?.remainingReadings;
  const currentPlan = usage?.plan as Parameters<typeof CategorySpreadSelector>[0]["currentPlan"];

  // ═════════════════════════════════════════════════════════════
  // Phase 1: 選択
  // ═════════════════════════════════════════════════════════════
  if (phase === "selection") {
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
                  selectCategoryAndSpreadPrompt: tSalon(
                    "selectCategoryAndSpread",
                  ),
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

  // ═════════════════════════════════════════════════════════════
  // Phase 2: AI リーディング (チャット入力欄なし)
  // ═════════════════════════════════════════════════════════════
  const tarotistImageUrl = selectedTarotist
    ? `/tarotists/${selectedTarotist.name}.png`
    : "";

  return (
    <>
      <ShuffleDialog
        isOpen={drawnCards.length === 0}
        onComplete={handleShuffleComplete}
        cardBackPath="/cards/back.png"
      />

      <div className="flex flex-col h-[100dvh] -m-4 md:-m-6">
        {/* ヘッダー */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-purple-100">
          <Link
            href="/"
            onClick={handleReadAgain}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors"
          >
            <ArrowLeft size={16} />
            {tCommon("backToHome")}
          </Link>
          {remainingQuick !== undefined && (
            <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full">
              {tSalon("remainingQuick", { count: remainingQuick })}
            </span>
          )}
        </div>

        {/* 上半分: UpperViewer (折りたたみ可) */}
        <motion.div
          className="flex-shrink-0 overflow-hidden"
          animate={{ height: isTopCollapsed ? 0 : "40vh" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {isReady && selectedSpread && selectedTarotist && (
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

        {/* 下半分: AI メッセージ表示 (チャット入力なし) */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  {msg.role === "assistant" && selectedTarotist && (
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-purple-100 mt-1">
                      <img
                        src={tarotistImageUrl}
                        alt={selectedTarotist.name}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: "center 20%" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%] ${
                      msg.role === "assistant"
                        ? "bg-white border border-gray-100 text-gray-800 shadow-sm"
                        : "bg-purple-600 text-white ml-auto"
                    }`}
                  >
                    {msg.parts
                      .filter((p) => p.type === "text")
                      .map((p) => (p as { type: "text"; text: string }).text)
                      .join("")}
                  </div>
                </div>
              ))}

              {status === "streaming" && (
                <div className="flex gap-2 items-center text-gray-400 text-xs px-3">
                  <div className="flex gap-1">
                    <span
                      className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span>{t("aiReading")}</span>
                </div>
              )}
            </div>

            {/* 占い完了後のアクション */}
            {isMessageComplete && (
              <div className="flex-shrink-0 border-t bg-white px-4 py-3">
                {remainingQuick !== undefined && remainingQuick > 0 ? (
                  <button
                    type="button"
                    onClick={handleReadAgain}
                    className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
                  >
                    <RefreshCw size={14} />
                    {t("readAgain")}
                  </button>
                ) : (
                  <p className="text-sm text-gray-400 text-center">
                    {t("limitReached")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
