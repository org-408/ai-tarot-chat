"use client";

import { CategorySpreadSelector } from "@shared/components/reading/category-spread-selector";
import { TarotistCarouselPortrait } from "@/components/reading/tarotist-carousel-portrait";
import type {
  Plan,
  ReadingCategory,
  Spread,
  Tarotist,
} from "@shared/lib/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface SelectionViewProps {
  /** パーソナル占いモード。true で CategorySpreadSelector を非表示、代わりに「対話を始める」ボタンのみ */
  isPersonal: boolean;
  tarotists: Tarotist[];
  selectedTarotist: Tarotist | null;
  onSelectTarotist: (tarotist: Tarotist) => void;
  /** 占い師選択カルーセルのモード変化（確定済=portrait） */
  onTarotistModeChange?: (mode: "carousel" | "portrait") => void;
  currentPlan: Plan | null;
  /** クイック占いで使用 */
  categories?: ReadingCategory[];
  spreads?: Spread[];
  /** 残り占い回数 */
  remainingCount?: number;
  isLoading?: boolean;
  /** クイック占い: スプレッド選択済 + 「占いを始める」押下で呼ばれる */
  onQuickStartReading?: (args: {
    category: ReadingCategory | null;
    spread: Spread;
  }) => void;
  /** パーソナル占い: 「対話を始める」ボタン押下で呼ばれる */
  onPersonalStartChat?: () => void;
  /** パーソナル: 選択済タロティストがポートレイトモードに入ったか */
  tarotistMode?: "carousel" | "portrait";

  // UI テキスト
  title: string;
  subtitle?: string;
  backLabel: string;
  remainingLabel?: string;
  // クイック用ラベル
  quickLabels?: {
    selectCategoryAndSpreadPrompt: string;
    categoryLabel: string;
    spreadLabel: string;
    selectPlaceholder: string;
    categoryQuestion: string;
    spreadQuestion: string;
    spreadSubtitle: string;
    startReading: string;
    limitReached: string;
    remainingText?: string;
    disabledMessage: string;
  };
  // パーソナル用ラベル
  personalLabels?: {
    startChat: string;
    limitReached: string;
    selectTarotistFirst: string;
    premiumOnly: string;
    upgradeAction: string;
    canPersonal: boolean;
  };
}

/**
 * クイック / パーソナル 占い共通のセレクト画面。
 * isPersonal=true: タロティストのみ選択 + 「対話を始める」
 * isPersonal=false: タロティスト + カテゴリ + スプレッド + 「占いを始める」
 */
export function SelectionView({
  isPersonal,
  tarotists,
  selectedTarotist,
  onSelectTarotist,
  onTarotistModeChange,
  currentPlan,
  categories,
  spreads,
  remainingCount,
  isLoading = false,
  onQuickStartReading,
  onPersonalStartChat,
  tarotistMode = "carousel",
  title,
  subtitle,
  backLabel,
  remainingLabel,
  quickLabels,
  personalLabels,
}: SelectionViewProps) {
  const canStartPersonal =
    isPersonal &&
    !!selectedTarotist &&
    (remainingCount === undefined || remainingCount > 0);

  return (
    <div
      className={`${
        isPersonal ? "max-w-md" : "max-w-5xl"
      } mx-auto space-y-4`}
    >
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors"
        >
          <ArrowLeft size={16} />
          {backLabel}
        </Link>
        {remainingLabel && (
          <span
            className={`text-xs px-3 py-1 rounded-full border ${
              isPersonal
                ? "bg-pink-50 text-pink-700 border-pink-100"
                : "bg-purple-50 text-purple-700 border-purple-100"
            }`}
          >
            {remainingLabel}
          </span>
        )}
      </div>

      <h1 className="text-xl font-bold text-gray-800">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}

      {/* パーソナル: プラン不足時のガード */}
      {isPersonal && personalLabels && !personalLabels.canPersonal ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400 mb-4">
            {personalLabels.premiumOnly}
          </p>
          <Link
            href="/plans"
            className="inline-block px-5 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow hover:opacity-90 transition-opacity"
          >
            {personalLabels.upgradeAction}
          </Link>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-purple-300 border-t-purple-600 animate-spin" />
        </div>
      ) : isPersonal ? (
        // ─── パーソナル: タロティスト選択 + 対話を始める ───
        <>
          <div
            className="bg-white/50 rounded-2xl border shadow-sm overflow-hidden mx-auto"
            style={{ height: "600px" }}
          >
            <TarotistCarouselPortrait
              tarotists={tarotists}
              selectedTarotist={selectedTarotist}
              onSelect={onSelectTarotist}
              onModeChange={onTarotistModeChange}
              currentPlan={currentPlan}
            />
          </div>
          <div className="px-1 pb-2">
            <button
              type="button"
              onClick={onPersonalStartChat}
              disabled={!canStartPersonal}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg shadow-2xl hover:from-purple-600 hover:to-pink-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {personalLabels?.startChat ?? "対話を始める"}
            </button>
            {personalLabels &&
              remainingCount !== undefined &&
              remainingCount <= 0 && (
                <div className="text-center text-xs text-black bg-purple-200/50 rounded-lg px-2 py-1 mt-2">
                  {personalLabels.limitReached}
                </div>
              )}
            {personalLabels && !selectedTarotist && (
              <div className="text-center text-xs text-gray-500 mt-2">
                {personalLabels.selectTarotistFirst}
              </div>
            )}
          </div>
        </>
      ) : (
        // ─── クイック: 2 カラム grid（タロティスト + カテゴリ/スプレッド）───
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            className="bg-white/50 rounded-2xl border shadow-sm overflow-hidden"
            style={{ height: "600px" }}
          >
            <TarotistCarouselPortrait
              tarotists={tarotists}
              selectedTarotist={selectedTarotist}
              onSelect={onSelectTarotist}
              onModeChange={onTarotistModeChange}
              currentPlan={currentPlan}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-4">
            {quickLabels && categories && spreads && onQuickStartReading && (
              <CategorySpreadSelector
                categories={categories}
                spreads={spreads}
                currentPlan={currentPlan}
                isPersonal={false}
                remainingCount={remainingCount}
                disabled={!selectedTarotist || tarotistMode !== "portrait"}
                onStartReading={onQuickStartReading}
                labels={quickLabels}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
