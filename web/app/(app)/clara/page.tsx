"use client";

import { CategorySpreadSelector } from "@shared/components/reading/category-spread-selector";
import { ShuffleDialog } from "@shared/components/reading/shuffle-dialog";
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

  const { data: masterData, init: initMaster, categories, spreads, isLoading } =
    useMasterStore();
  const { refreshUsage, usage } = useClientStore();

  const [phase, setPhase] = useState<Phase>("selection");
  const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [isShuffling, setIsShuffling] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage]);

  const handleStartReading = ({
    spread,
  }: { category: ReadingCategory | null; spread: Spread }) => {
    setSelectedSpread(spread);
    setDrawnCards([]);
    setRevealedCards(new Set());
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
    setRevealedCards(new Set());
  };

  const toggleReveal = (cardId: string) => {
    setRevealedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const currentPlan = usage?.plan as Parameters<typeof CategorySpreadSelector>[0]["currentPlan"];

  // ── Phase 1: スプレッド選択 ──
  if (phase === "selection") {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* ヘッダー */}
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

  // ── Phase 2: カード表示 ──
  return (
    <>
      <ShuffleDialog
        isOpen={isShuffling}
        onComplete={handleShuffleComplete}
        cardBackPath="/cards/back.png"
      />

      <div className="max-w-3xl mx-auto space-y-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleReadAgain}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <ArrowLeft size={16} />
            {tCommon("back")}
          </button>
          <h2 className="text-sm font-medium text-gray-600">{t("phase2Title")}</h2>
          <button
            type="button"
            onClick={handleReadAgain}
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <RefreshCw size={12} />
            {t("readAgain")}
          </button>
        </div>

        {selectedSpread && (
          <p className="text-xs text-gray-500 text-center">
            {selectedSpread.name}
            {selectedSpread.guide && (
              <> — {selectedSpread.guide}</>
            )}
          </p>
        )}

        {/* カードグリッド */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {drawnCards.map((drawnCard, idx) => {
            const cardId = drawnCard.card?.id ?? drawnCard.cardId;
            const isRevealed = revealedCards.has(cardId);
            const cell = selectedSpread?.cells?.[idx];
            const cardNo = drawnCard.card?.no ?? 0;
            const cardCode = drawnCard.card?.code ?? "";
            const cardName = drawnCard.card?.name ?? drawnCard.position;
            const keywords = drawnCard.isReversed
              ? (drawnCard.card?.reversedKeywords ?? [])
              : (drawnCard.card?.uprightKeywords ?? []);

            return (
              <div key={cardId} className="space-y-2">
                {/* ポジション名 */}
                {cell && (
                  <p className="text-xs text-center text-gray-500 font-medium">
                    {cell.position}
                  </p>
                )}

                {/* カード */}
                <button
                  type="button"
                  onClick={() => toggleReveal(cardId)}
                  className="w-full aspect-[2/3] rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-full h-full relative">
                    {isRevealed ? (
                      <img
                        src={`/cards/${cardNo}_${cardCode}.png`}
                        alt={cardName}
                        className={`w-full h-full object-cover ${
                          drawnCard.isReversed ? "rotate-180" : ""
                        }`}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/cards/back.png";
                        }}
                      />
                    ) : (
                      <img
                        src="/cards/back.png"
                        alt="カード裏面"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </button>

                {/* カード情報 */}
                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold text-gray-700">
                    {isRevealed ? cardName : "?"}
                  </p>
                  {isRevealed && drawnCard.isReversed && (
                    <span className="inline-block text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">
                      {t("reversed")}
                    </span>
                  )}

                  {isRevealed && keywords.length > 0 && (
                    <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
                      {keywords.join("・")}
                    </p>
                  )}

                  {!isRevealed && (
                    <p className="text-[10px] text-gray-400 italic">{t("tapToReveal")}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
