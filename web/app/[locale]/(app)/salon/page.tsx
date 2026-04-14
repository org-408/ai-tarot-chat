"use client";

import { CategorySpreadSelector } from "@shared/components/reading/category-spread-selector";
import { TarotistSelector } from "@shared/components/reading/tarotist-selector";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useSalonStore } from "@/lib/client/stores/salon-store";
import type { ReadingCategory, Spread, Tarotist } from "@shared/lib/types";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ReadingType = "quick" | "personal";

export default function SalonPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const t = useTranslations("salon");
  const router = useRouter();
  const [locale, setLocale] = useState("ja");
  const [readingType, setReadingType] = useState<ReadingType>("quick");

  const { init: initMaster, tarotists, categories, spreads, isLoading } = useMasterStore();
  const { refreshUsage, usage } = useClientStore();
  const { selectedTarotist, setSelectedTarotist, setIsPersonal } = useSalonStore();

  useEffect(() => {
    params.then(({ locale: l }) => setLocale(l));
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage, params]);

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
    router.push(`/${locale}/${readingType === "personal" ? "personal" : "reading"}`);
  };

  const handleSelectTarotist = (tarotist: Tarotist) => {
    setSelectedTarotist(tarotist);
  };

  const remainingQuick = usage?.remainingReadings;
  const remainingPersonal = usage?.remainingPersonal;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔮</div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* タイトル */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          {t("title")}
        </h1>
        <p className="text-gray-600">{t("selectType")}</p>
      </div>

      {/* 占い種別タブ */}
      <div className="flex gap-3 mb-8 justify-center">
        {(["quick", "personal"] as ReadingType[]).map((type) => (
          <button
            key={type}
            onClick={() => setReadingType(type)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              readingType === type
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105"
                : "bg-white border border-gray-200 text-gray-600 hover:border-purple-300"
            }`}
          >
            {type === "quick" ? t("quickReading") : t("personalReading")}
          </button>
        ))}
      </div>

      {/* 種別説明 */}
      <p className="text-center text-sm text-gray-500 mb-6">
        {readingType === "quick" ? t("quickDesc") : t("personalDesc")}
      </p>

      {/* 利用残回数 */}
      {usage && (
        <div className="flex gap-4 justify-center mb-6 text-sm text-gray-500">
          {readingType === "quick" && remainingQuick !== undefined && (
            <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full">
              {remainingQuick <= 0
                ? t("limitReached")
                : t("remainingQuick", { count: remainingQuick })}
            </span>
          )}
          {readingType === "personal" && remainingPersonal !== undefined && (
            <span className="bg-pink-50 text-pink-700 px-3 py-1 rounded-full">
              {remainingPersonal <= 0
                ? t("limitReached")
                : t("remainingPersonal", { count: remainingPersonal })}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 占い師選択 */}
        <div className="bg-white rounded-2xl shadow-sm border p-4">
          <h2 className="font-semibold text-gray-700 mb-4">
            {t("selectTarotist")}
          </h2>
          <TarotistSelector
            tarotists={tarotists}
            selectedTarotist={selectedTarotist}
            onSelect={handleSelectTarotist}
            premiumOnly={readingType === "personal"}
            currentPlan={usage?.plan as Parameters<typeof TarotistSelector>[0]["currentPlan"]}
            tarotistBasePath="/tarotists"
          />
        </div>

        {/* カテゴリ・スプレッド選択 */}
        <div className="bg-white rounded-2xl shadow-sm border p-4">
          <CategorySpreadSelector
            categories={categories}
            spreads={spreads}
            currentPlan={usage?.plan as Parameters<typeof CategorySpreadSelector>[0]["currentPlan"]}
            isPersonal={readingType === "personal"}
            remainingCount={readingType === "personal" ? remainingPersonal : remainingQuick}
            onStartReading={handleStartReading}
          />
        </div>
      </div>
    </div>
  );
}
