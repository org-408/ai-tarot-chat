"use client";

import { CategorySpreadSelector } from "@shared/components/reading/category-spread-selector";
import { TarotistCarouselPortrait } from "@/components/reading/tarotist-carousel-portrait";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useSalonStore } from "@/lib/client/stores/salon-store";
import type { ReadingCategory, Spread, Tarotist } from "@shared/lib/types";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

type ReadingType = "quick" | "personal";

export default function SalonPage() {
  const t = useTranslations("salon");
  const tTarotist = useTranslations("tarotist");
  const router = useRouter();
  const [readingType, setReadingType] = useState<ReadingType>("quick");

  const { init: initMaster, tarotists, categories, spreads, isLoading } = useMasterStore();
  const { refreshUsage, usage } = useClientStore();
  const { selectedTarotist, setSelectedTarotist } = useSalonStore();

  useEffect(() => {
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage]);

  const handleStartReading = ({
    category,
    spread,
  }: {
    category: ReadingCategory | null;
    spread: Spread;
  }) => {
    useSalonStore.getState().setSelectedSpread(spread);
    useSalonStore.getState().setSelectedCategory(category);
    useSalonStore.getState().setIsPersonal(readingType === "personal");
    router.push(readingType === "personal" ? "/personal" : "/reading");
  };

  const handleSelectTarotist = (tarotist: Tarotist) => {
    setSelectedTarotist(tarotist);
    // パーソナル占いで PREMIUM でない占い師を選択したら quick に戻す
    if (readingType === "personal" && tarotist.plan?.code !== "PREMIUM") {
      setReadingType("quick");
    }
  };

  // プランにパーソナル占い権限があるか
  const canPersonal = usage == null || (usage.plan?.hasPersonal ?? false);

  useEffect(() => {
    if (!canPersonal && readingType === "personal") {
      setReadingType("quick");
    }
  }, [canPersonal, readingType]);

  // パーソナル占いモードのとき PREMIUM 占い師のみ表示
  const visibleTarotists =
    readingType === "personal"
      ? tarotists.filter((t) => t.plan?.code === "PREMIUM")
      : tarotists;

  const remainingQuick = usage?.remainingReadings;
  const remainingPersonal = usage?.remainingPersonal;
  const currentRemaining =
    readingType === "personal" ? remainingPersonal : remainingQuick;

  const remainingText =
    currentRemaining !== undefined && currentRemaining > 0
      ? t("remainingToday", { count: currentRemaining })
      : undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-full border-4 border-purple-300 border-t-purple-600 animate-spin" />
          <p className="text-gray-500">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* タイトル＋タブ */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          {t("title")}
        </h1>

        <div className="flex gap-2">
          {(["quick", "personal"] as ReadingType[]).map((type) => {
            const isDisabled = type === "personal" && !canPersonal;
            return (
              <button
                key={type}
                type="button"
                onClick={() => !isDisabled && setReadingType(type)}
                disabled={isDisabled}
                title={isDisabled ? t("personalPremiumRequired") : undefined}
                className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
                  readingType === type
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md scale-105"
                    : isDisabled
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-purple-300"
                }`}
              >
                {type === "quick" ? t("quickReading") : t("personalReading")}
                {isDisabled && (
                  <svg className="inline w-3.5 h-3.5 ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-8a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm0 2a2 2 0 012 2v2H8V6a2 2 0 012-2zm0 8a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 残回数 */}
      {usage && (
        <div className="flex gap-3 justify-end mb-4 text-xs">
          {readingType === "quick" && remainingQuick !== undefined && (
            <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full">
              {remainingQuick <= 0 ? t("limitReached") : t("remainingQuick", { count: remainingQuick })}
            </span>
          )}
          {readingType === "personal" && remainingPersonal !== undefined && (
            <span className="bg-pink-50 text-pink-700 px-3 py-1 rounded-full">
              {remainingPersonal <= 0 ? t("limitReached") : t("remainingPersonal", { count: remainingPersonal })}
            </span>
          )}
        </div>
      )}

      {/* メインコンテンツ: 占い師カルーセル（左） + ジャンル/スプレッド選択（右） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 占い師カルーセル */}
        <div className="bg-white/50 rounded-2xl border shadow-sm overflow-hidden" style={{ height: "600px" }}>
          <TarotistCarouselPortrait
            tarotists={visibleTarotists}
            selectedTarotist={selectedTarotist}
            onSelect={handleSelectTarotist}
            currentPlan={usage?.plan as Parameters<typeof TarotistCarouselPortrait>[0]["currentPlan"]}
          />
        </div>

        {/* ジャンル・スプレッド選択 */}
        <div className="bg-white rounded-2xl shadow-sm border p-4">
          <h2 className="font-semibold text-gray-700 mb-4">{t("selectCategoryAndSpread")}</h2>
          <CategorySpreadSelector
            categories={categories}
            spreads={spreads}
            currentPlan={usage?.plan as Parameters<typeof CategorySpreadSelector>[0]["currentPlan"]}
            isPersonal={readingType === "personal"}
            remainingCount={currentRemaining}
            disabled={!selectedTarotist}
            onStartReading={handleStartReading}
            labels={{
              selectSpreadPrompt: t("selectSpread"),
              selectCategoryAndSpreadPrompt: t("selectCategoryAndSpread"),
              categoryLabel: t("categoryLabel"),
              spreadLabel: t("spreadLabel"),
              selectPlaceholder: t("selectPlaceholder"),
              categoryQuestion: t("categoryQuestion"),
              spreadQuestion: t("spreadQuestion"),
              spreadSubtitle: t("spreadSubtitle"),
              startReading: t("startReading"),
              limitReached: t("limitReached"),
              remainingText,
              disabledMessage: t("selectTarotistFirst"),
            }}
          />
        </div>
      </div>

      {/* アップグレード案内 */}
      {usage && usage.plan?.code !== "PREMIUM" && (
        <div className="mt-6 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-purple-800 text-sm">
              {usage.plan?.code === "GUEST" ? t("upgradeGuestTitle") : t("upgradeTitle")}
            </p>
            <p className="text-xs text-purple-600 mt-0.5">{t("upgradeDesc")}</p>
          </div>
          <Link
            href="/plans"
            className="shrink-0 px-5 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow hover:opacity-90 transition-opacity"
          >
            {t("upgradeAction")}
          </Link>
        </div>
      )}
    </div>
  );
}
