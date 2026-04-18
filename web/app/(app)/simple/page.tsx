"use client";

import { CategorySpreadSelector } from "@shared/components/reading/category-spread-selector";
import { RevealPromptPanel } from "@shared/components/reading/reveal-prompt-panel";
import { ShuffleDialog } from "@shared/components/reading/shuffle-dialog";
import { UpperViewer } from "@shared/components/tarot/upper-viewer";
import { LowerViewer } from "@shared/components/tarot/lower-viewer";
import { TarotistCarouselPortrait } from "@/components/reading/tarotist-carousel-portrait";
import { useChatSession } from "@shared/hooks/use-chat-session";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useSalonStore } from "@/lib/client/stores/salon-store";
import { drawRandomCards } from "@/lib/client/services/draw-service";
import type { ReadingCategory, Spread } from "@shared/lib/types";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

type Phase = "selection" | "reading";

export default function SimplePage() {
  const t = useTranslations("simple");
  const tSalon = useTranslations("salon");
  const tReading = useTranslations("reading");
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

  const token = (session as { accessToken?: string })?.accessToken ?? "";

  useEffect(() => {
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage]);

  useEffect(() => {
    if (!masterData || !selectedSpread || drawnCards.length > 0) return;
    const cards = drawRandomCards(masterData, selectedSpread);
    setDrawnCards(cards);
  }, [masterData, selectedSpread, drawnCards.length, setDrawnCards]);

  const {
    messages,
    status,
    phase2Stage,
    questionsRemaining,
    isMessageComplete,
    handleSessionClose,
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
    }
  );

  const handleStartReading = ({
    category,
    spread,
  }: { category: ReadingCategory | null; spread: Spread }) => {
    useSalonStore.getState().setQuickSpread(spread);
    useSalonStore.getState().setQuickCategory(category);
    resetSession();
    setPhase("reading");
    setIsReady(false);
  };

  const handleShuffleComplete = () => {
    setIsReady(true);
    setTimeout(() => setIsRevealingCompleted(false), 100);
  };

  const handleReadAgain = () => {
    resetSession();
    setPhase("selection");
    setIsReady(false);
  };

  const remainingQuick = usage?.remainingReadings;
  const currentPlan = usage?.plan as Parameters<typeof CategorySpreadSelector>[0]["currentPlan"];

  // ── Phase 1: 選択画面 ──
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
            {/* 占い師選択 */}
            <div
              className="bg-white/50 rounded-2xl border shadow-sm overflow-hidden"
              style={{ height: "600px" }}
            >
              <TarotistCarouselPortrait
                tarotists={tarotists}
                selectedTarotist={selectedTarotist}
                onSelect={setQuickTarotist}
                currentPlan={usage?.plan as Parameters<typeof TarotistCarouselPortrait>[0]["currentPlan"] ?? null}
              />
            </div>

            {/* スプレッド選択 */}
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

  // ── Phase 2: リーディング画面 ──
  const tarotistImageUrl = selectedTarotist
    ? `/tarotists/${selectedTarotist.name}.png`
    : "";

  const selectorContent = (
    <RevealPromptPanel
      isAllRevealed={isRevealingCompleted}
      onRevealAll={() => setIsRevealingCompleted(true)}
    />
  );

  // AIメッセージ表示（チャット入力なし）
  const aiContent = (
    <div className="flex flex-col h-full overflow-hidden">
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
                    (e.currentTarget as HTMLImageElement).style.display = "none";
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
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
            <p className="text-sm text-gray-400 text-center">{t("limitReached")}</p>
          )}
        </div>
      )}
    </div>
  );

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
              {tReading("remainingQuick", { count: remainingQuick })}
            </span>
          )}
        </div>

        {/* カードビューア */}
        <div className="flex-shrink-0" style={{ height: "40vh" }}>
          {isReady && selectedSpread && selectedTarotist && (
            <UpperViewer
              spread={selectedSpread}
              drawnCards={drawnCards}
              isRevealingCompleted={isRevealingCompleted}
              onRevealingCompleted={() => setIsRevealingCompleted(true)}
              tarotistImageUrl={tarotistImageUrl}
              tarotistName={selectedTarotist.name}
              cardBasePath="/cards"
            />
          )}
        </div>

        {/* 下部: カード操作 / AIメッセージ */}
        <div className="flex-1 overflow-hidden">
          <LowerViewer
            selectorContent={selectorContent}
            personalContent={aiContent}
            defaultMode="selector"
            selectorLabel={tReading("tabCards")}
            personalLabel={tReading("tabChat")}
          />
        </div>
      </div>
    </>
  );
}
