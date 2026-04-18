"use client";

import { CategorySpreadSelector } from "@shared/components/reading/category-spread-selector";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useSalonStore } from "@/lib/client/stores/salon-store";
import type { ReadingCategory, Spread, Tarotist } from "@shared/lib/types";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Zap, Sparkles, History } from "lucide-react";

// ─── コンパクト占い師セレクター ────────────────────────────────
interface TarotistRowProps {
  tarotists: Tarotist[];
  selected: Tarotist | null;
  onSelect: (t: Tarotist) => void;
}

function TarotistRow({ tarotists, selected, onSelect }: TarotistRowProps) {
  if (tarotists.length === 0) {
    return <p className="text-xs text-gray-400 py-2">占い師が見つかりません</p>;
  }
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
      {tarotists.map((t) => {
        const isSelected = selected?.id === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            className="flex flex-col items-center gap-1 flex-shrink-0 group"
          >
            <div
              className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                isSelected
                  ? "border-purple-500 shadow-md shadow-purple-200 scale-110"
                  : "border-gray-200 group-hover:border-purple-300"
              }`}
            >
              <img
                src={`/tarotists/${t.name}.png`}
                alt={t.name}
                className="w-full h-full object-cover"
                style={{ objectPosition: "center 20%" }}
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.style.display = "none";
                  el.parentElement!.classList.add(
                    "bg-gradient-to-br", "from-purple-700", "to-indigo-800",
                    "flex", "items-center", "justify-center", "text-white", "text-xl"
                  );
                  el.parentElement!.textContent = t.icon;
                }}
              />
            </div>
            <span
              className={`text-[10px] font-medium max-w-[56px] truncate ${
                isSelected ? "text-purple-700" : "text-gray-500"
              }`}
            >
              {t.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── ホームページ ───────────────────────────────────────────────
export default function HomePage() {
  const t = useTranslations("home");
  const tSalon = useTranslations("salon");
  const router = useRouter();

  const { init: initMaster, tarotists, categories, spreads, isLoading } =
    useMasterStore();
  const { refreshUsage, usage, readings, fetchReadings } = useClientStore();
  const {
    quickTarotist, quickSpread, quickCategory,
    personalTarotist, personalSpread, personalCategory,
    setQuickTarotist, setQuickSpread, setQuickCategory,
    setPersonalTarotist, setPersonalSpread, setPersonalCategory,
    setIsPersonal,
  } = useSalonStore();

  useEffect(() => {
    initMaster();
    refreshUsage();
    fetchReadings();
  }, [initMaster, refreshUsage, fetchReadings]);

  const canPersonal = usage == null || (usage.plan?.hasPersonal ?? false);
  const premiumTarotists = tarotists.filter((t) => t.plan?.code === "PREMIUM");

  const handleStartQuick = ({
    category, spread,
  }: { category: ReadingCategory | null; spread: Spread }) => {
    setQuickSpread(spread);
    setQuickCategory(category);
    setIsPersonal(false);
    router.push("/reading");
  };

  const handleStartPersonal = ({
    category, spread,
  }: { category: ReadingCategory | null; spread: Spread }) => {
    setPersonalSpread(spread);
    setPersonalCategory(category);
    setIsPersonal(true);
    router.push("/personal");
  };

  const remainingQuick = usage?.remainingReadings;
  const remainingPersonal = usage?.remainingPersonal;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-full border-4 border-purple-300 border-t-purple-600 animate-spin" />
          <p className="text-gray-500">{tSalon("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* タイトル + 残り回数 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
        </div>
        {usage && (
          <div className="flex gap-2 text-xs">
            {remainingQuick !== undefined && (
              <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-100">
                {tSalon("remainingQuick", { count: remainingQuick })}
              </span>
            )}
            {remainingPersonal !== undefined && canPersonal && (
              <span className="bg-pink-50 text-pink-700 px-3 py-1 rounded-full border border-pink-100">
                {tSalon("remainingPersonal", { count: remainingPersonal })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2カラム: クイック + パーソナル */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── クイック占い ── */}
        <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Zap className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{t("quickTitle")}</h2>
              <p className="text-xs text-gray-500">{t("quickDesc")}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">{tSalon("selectTarotist")}</p>
            <TarotistRow
              tarotists={tarotists}
              selected={quickTarotist}
              onSelect={setQuickTarotist}
            />
          </div>

          <CategorySpreadSelector
            categories={categories}
            spreads={spreads}
            currentPlan={usage?.plan as Parameters<typeof CategorySpreadSelector>[0]["currentPlan"]}
            isPersonal={false}
            remainingCount={remainingQuick}
            disabled={!quickTarotist}
            onStartReading={handleStartQuick}
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

        {/* ── パーソナル占い ── */}
        <div
          className={`rounded-2xl shadow-sm border p-5 space-y-4 ${
            canPersonal ? "bg-white" : "bg-gray-50 opacity-80"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${canPersonal ? "bg-pink-100" : "bg-gray-200"}`}>
              <Sparkles className={`w-4 h-4 ${canPersonal ? "text-pink-600" : "text-gray-400"}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`font-bold ${canPersonal ? "text-gray-900" : "text-gray-400"}`}>
                  {t("personalTitle")}
                </h2>
                {!canPersonal && (
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                    {tSalon("personalPremiumRequired")}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{t("personalDesc")}</p>
            </div>
          </div>

          {canPersonal ? (
            <>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">{tSalon("selectTarotist")}</p>
                <TarotistRow
                  tarotists={premiumTarotists}
                  selected={personalTarotist}
                  onSelect={setPersonalTarotist}
                />
              </div>
              <CategorySpreadSelector
                categories={categories}
                spreads={spreads}
                currentPlan={usage?.plan as Parameters<typeof CategorySpreadSelector>[0]["currentPlan"]}
                isPersonal={true}
                remainingCount={remainingPersonal}
                disabled={!personalTarotist}
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
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-4">{t("personalLocked")}</p>
              <Link
                href="/plans"
                className="inline-block px-5 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow hover:opacity-90 transition-opacity"
              >
                {tSalon("upgradeAction")}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 最近の占い履歴 */}
      {readings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-700 text-sm">{t("recentHistory")}</h3>
            </div>
            <Link href="/history" className="text-xs text-purple-600 hover:underline">
              {t("viewAll")}
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {readings.slice(0, 5).map((r) => (
              <Link
                key={r.id}
                href={`/history/${r.id}`}
                className="flex-shrink-0 w-36 bg-white rounded-xl border p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-purple-100">
                    <img
                      src={`/tarotists/${r.tarotist?.name}.png`}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {r.tarotist?.name ?? "?"}
                  </span>
                </div>
                {r.category == null && (
                  <span className="text-[10px] bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full">
                    パーソナル
                  </span>
                )}
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(r.createdAt).toLocaleDateString("ja-JP", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* アップグレード案内 */}
      {usage && usage.plan?.code !== "PREMIUM" && (
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-purple-800 text-sm">
              {usage.plan?.code === "GUEST" ? tSalon("upgradeGuestTitle") : tSalon("upgradeTitle")}
            </p>
            <p className="text-xs text-purple-600 mt-0.5">{tSalon("upgradeDesc")}</p>
          </div>
          <Link
            href="/plans"
            className="shrink-0 px-5 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow hover:opacity-90 transition-opacity"
          >
            {tSalon("upgradeAction")}
          </Link>
        </div>
      )}
    </div>
  );
}
