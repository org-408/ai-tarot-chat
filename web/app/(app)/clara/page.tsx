"use client";

import { CategorySpreadSelector } from "@shared/components/reading/category-spread-selector";
import { RevealPromptPanel } from "@shared/components/reading/reveal-prompt-panel";
import { ShuffleDialog } from "@shared/components/reading/shuffle-dialog";
import { UpperViewer } from "@shared/components/tarot/upper-viewer";
import { LowerViewer } from "@shared/components/tarot/lower-viewer";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { drawRandomCards } from "@/lib/client/services/draw-service";
import type { DrawnCard, ReadingCategory, Spread } from "@shared/lib/types";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";

type Phase = "selection" | "reading";

export default function ClaraPage() {
  const t = useTranslations("clara");
  const tSalon = useTranslations("salon");
  const tCommon = useTranslations("common");
  const tReading = useTranslations("reading");

  const { data: masterData, init: initMaster, categories, spreads, isLoading } =
    useMasterStore();
  const { refreshUsage, usage } = useClientStore();

  const [phase, setPhase] = useState<Phase>("selection");
  const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isRevealingCompleted, setIsRevealingCompleted] = useState(false);

  useEffect(() => {
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage]);

  const handleStartReading = ({
    spread,
  }: { category: ReadingCategory | null; spread: Spread }) => {
    setSelectedSpread(spread);
    setDrawnCards([]);
    setIsRevealingCompleted(false);
    setIsShuffling(true);
  };

  const handleShuffleComplete = () => {
    setIsShuffling(false);
    if (!masterData || !selectedSpread) return;
    const cards = drawRandomCards(masterData, selectedSpread);
    setDrawnCards(cards);
    setPhase("reading");
  };

  const handleReadAgain = () => {
    setPhase("selection");
    setSelectedSpread(null);
    setDrawnCards([]);
    setIsRevealingCompleted(false);
  };

  const currentPlan = usage?.plan as Parameters<typeof CategorySpreadSelector>[0]["currentPlan"];

  // ── Phase 1: スプレッド選択 ──
  if (phase === "selection") {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <ArrowLeft size={16} />
            {tCommon("backToHome")}
          </Link>
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-800">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("desc")}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-300 border-t-indigo-600 animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border p-4">
            <CategorySpreadSelector
              categories={categories}
              spreads={spreads}
              currentPlan={currentPlan}
              isPersonal={false}
              remainingCount={undefined}
              disabled={false}
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
                startReading: t("startReading"),
                limitReached: tSalon("limitReached"),
                remainingText: undefined,
                disabledMessage: tSalon("selectPlaceholder"),
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // ── Phase 2: カード表示（UpperViewer + キーワード）──
  const selectorContent = (
    <RevealPromptPanel
      isAllRevealed={isRevealingCompleted}
      onRevealAll={() => setIsRevealingCompleted(true)}
    />
  );

  const keywordsContent = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {drawnCards.map((drawnCard) => {
          const cardName = drawnCard.card?.name ?? drawnCard.position;
          const keywords = drawnCard.isReversed
            ? (drawnCard.card?.reversedKeywords ?? [])
            : (drawnCard.card?.uprightKeywords ?? []);

          return (
            <div
              key={drawnCard.card?.id ?? drawnCard.cardId}
              className="bg-white rounded-xl border p-3 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-800">{cardName}</span>
                <span className="text-xs text-gray-400">{drawnCard.position}</span>
                {drawnCard.isReversed && (
                  <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">
                    {t("reversed")}
                  </span>
                )}
              </div>
              {keywords.length > 0 && (
                <p className="text-xs text-gray-500 leading-relaxed">
                  {keywords.join("・")}
                </p>
              )}
            </div>
          );
        })}

        {/* もう一度占うボタン */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleReadAgain}
            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            <RefreshCw size={14} />
            {t("readAgain")}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ShuffleDialog
        isOpen={isShuffling}
        onComplete={handleShuffleComplete}
        cardBackPath="/cards/back.png"
      />

      <div className="flex flex-col h-[100dvh] -m-4 md:-m-6">
        {/* ヘッダー */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-indigo-100">
          <button
            type="button"
            onClick={handleReadAgain}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <ArrowLeft size={16} />
            {tCommon("backToHome")}
          </button>
          <span className="text-xs text-indigo-600 font-medium">{t("phase2Title")}</span>
        </div>

        {/* UpperViewer */}
        <div className="flex-shrink-0" style={{ height: "40vh" }}>
          {selectedSpread && (
            <UpperViewer
              spread={selectedSpread}
              drawnCards={drawnCards}
              isRevealingCompleted={isRevealingCompleted}
              onRevealingCompleted={() => setIsRevealingCompleted(true)}
              tarotistImageUrl="/tarotists/Ariadne.png"
              tarotistName="Clara"
              cardBasePath="/cards"
            />
          )}
        </div>

        {/* LowerViewer: カード操作 / キーワード */}
        <div className="flex-1 overflow-hidden">
          <LowerViewer
            selectorContent={selectorContent}
            personalContent={keywordsContent}
            defaultMode="selector"
            selectorLabel={tReading("tabCards")}
            personalLabel={t("keywords")}
          />
        </div>
      </div>
    </>
  );
}
