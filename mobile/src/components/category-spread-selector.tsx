import { motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import type {
  ReadingCategory,
  Spread,
  SpreadToCategory,
} from "../../../shared/lib/types";
import { useClient } from "../lib/hooks/use-client";
import { useMaster } from "../lib/hooks/use-master";
import { useSalon } from "../lib/hooks/use-salon";
import { CLARA_CATEGORY_NAMES } from "../lib/utils/offline-reading";
import Accordion, { type AccordionItem } from "./accordion";
import ScrollableRadioSelector from "./scrollable-radio-selector";

interface CategorySpreadSelectorProps {
  handleStartReading: () => void;
  claraMode?: boolean; // いつでも占いモード：プラン制限なし・全カテゴリ・全スプレッド
}

const CategorySpreadSelector: React.FC<CategorySpreadSelectorProps> = ({
  handleStartReading: onHandleStartReading,
  claraMode = false,
}) => {
  const { masterData } = useMaster();
  const { currentPlan, remainingReadings, remainingPersonal } = useClient();
  const {
    selectedCategory,
    setSelectedCategory,
    selectedSpread,
    setSelectedSpread,
    lastClaraCategoryId,
    lastClaraSpreadId,
    setLastClaraSelection,
    isPersonal,
  } = useSalon();

  // カテゴリーの取得とフィルタリング
  const availableCategories = useMemo(() => {
    if (!masterData.categories) return [];

    return (
      masterData.categories
        .filter((category: ReadingCategory) => {
          // claraMode: meanings に対応する4カテゴリのみ（love/career/health/money）
          if (claraMode) return (CLARA_CATEGORY_NAMES as readonly string[]).includes(category.name);
          // GUESTとFREEは、恋愛・健康・金運を除外
          if (currentPlan!.code === "GUEST" || currentPlan!.code === "FREE") {
            if (["恋愛", "仕事", "今日の運勢"].includes(category.name)) {
              return true;
            } else {
              return false;
            }
          } else {
            return true;
          }
        })
        // bioプロパティをdescriptionからコピー
        .map((category: ReadingCategory) => ({
          ...category,
          bio: category.description,
        }))
    );
  }, [masterData, currentPlan, claraMode]);

  const categoryItems: AccordionItem[] = [
    {
      id: "category",
      title: `ジャンル: ${selectedCategory?.name || "選択してください"}`,
      subtitle: selectedCategory ? selectedCategory.description : undefined,
      icon: "🎴",
      content: (
        <ScrollableRadioSelector
          title="どのジャンルを占いますか?"
          items={availableCategories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          maxVisibleItems={3}
        />
      ),
    },
  ];

  // スプレッドの取得とフィルタリング
  const availableSpreads = useMemo(() => {
    if (!masterData.spreads || !masterData.categories)
      return [];

    return masterData.spreads
      .filter((spread: Spread) => {
        // spread.plan, spread.categoriesが存在しない場合はfalse(データ破損)
        if (!isPersonal) {
          if (!spread.categories) return false;
          // スプレッド内のカテゴリー一覧にselectedCategoryが含まれているか
          const spreadCatetories = spread.categories.map(
            (stc: SpreadToCategory) => stc.category?.name
          );
          if (claraMode) {
            // claraMode: カテゴリー一致のみ確認（プラン制限なし）
            return spreadCatetories.includes(selectedCategory?.name || "");
          }
          if (!spread.plan || !currentPlan) return false;
          if (
            currentPlan.no >= spread.plan!.no &&
            spreadCatetories.includes(selectedCategory?.name || "")
          ) {
            return true;
          }
        } else {
          // パーソナル占いモードの場合、カテゴリー条件は不要だがプラン制限は適用する
          if (!spread.plan || !currentPlan) return false;
          return currentPlan.no >= spread.plan!.no;
        }
      })
      .map((spread: Spread) => ({ ...spread, bio: spread.guide }));
  }, [
    currentPlan,
    isPersonal,
    claraMode,
    masterData.categories,
    masterData.spreads,
    selectedCategory?.name,
  ]);

  const spreadItems: AccordionItem[] = [
    {
      id: "spread",
      title: `スプレッド: ${selectedSpread?.name || "選択してください"}`,
      subtitle: selectedSpread
        ? selectedSpread.guide ||
          `使用するタロットカード枚数：${selectedSpread.cells?.length || 0}枚`
        : undefined,
      icon: "🎯",
      content: (
        <ScrollableRadioSelector
          title="どのスプレッドで占いますか？"
          subtitle="(カテゴリごとに選択肢が変わります)"
          items={availableSpreads}
          selected={selectedSpread}
          onSelect={setSelectedSpread}
          maxVisibleItems={3}
        />
      ),
    },
  ];

  useEffect(() => {
    console.log("[SalonPage] availableCategories changed", availableCategories);
    const isSelectedInList = availableCategories.some(
      (c) => c.id === selectedCategory?.id
    );
    if (availableCategories.length === 0 || isSelectedInList) return;

    if (claraMode && lastClaraCategoryId) {
      const lastClaraCategory = availableCategories.find(
        (category) => category.id === lastClaraCategoryId
      );
      if (lastClaraCategory) {
        setSelectedCategory(lastClaraCategory);
        return;
      }
    }

    setSelectedCategory(availableCategories[0]);
  }, [
    availableCategories,
    claraMode,
    lastClaraCategoryId,
    selectedCategory,
    setSelectedCategory,
  ]);

  useEffect(() => {
    console.log("[SalonPage] availableSpreads changed", availableSpreads);
    const isSelectedInList = availableSpreads.some(
      (spread) => spread.id === selectedSpread?.id
    );
    if (availableSpreads.length === 0 || isSelectedInList) return;

    if (claraMode && lastClaraSpreadId) {
      const lastClaraSpread = availableSpreads.find(
        (spread) => spread.id === lastClaraSpreadId
      );
      if (lastClaraSpread) {
        setSelectedSpread(lastClaraSpread);
        return;
      }
    }

    setSelectedSpread(availableSpreads[0]);
  }, [
    availableSpreads,
    claraMode,
    lastClaraSpreadId,
    selectedSpread,
    setSelectedSpread,
  ]);

  const remaining = isPersonal
    ? remainingPersonal
    : remainingReadings;
  const debugMode = import.meta.env.VITE_DEBUG_MODE === "true";
  // claraModeおよびdebugModeは回数制限なし
  const isLimitReached = !claraMode && !(isPersonal && debugMode) && remaining !== undefined && remaining <= 0;

  const isDisabled =
    isLimitReached ||
    !selectedSpread ||
    ((!isPersonal || claraMode) && !selectedCategory);

  const handleStartReading = () => {
    if (isDisabled) return;
    const categoryToUse = selectedCategory || availableCategories[0];
    const spreadToUse = selectedSpread || availableSpreads[0];

    setSelectedCategory(categoryToUse);
    setSelectedSpread(spreadToUse);
    if (claraMode) {
      setLastClaraSelection(categoryToUse?.id ?? null, spreadToUse?.id ?? null);
    }
    onHandleStartReading();
  };

  return (
    <>
      {/* スワイプヒント */}
      <motion.div
        className="text-center py-4"
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        <span
          className="text-gray-800 bg-white/70
            backdrop-blur-sm px-4 py-2 rounded-full shadow-md"
        >
          {!isPersonal
            ? `占うジャンルとスプレッドを選んでください`
            : `スプレッドを選んでください`}
        </span>
      </motion.div>

      {/* カテゴリー選択アコーディオン */}
      {(!isPersonal || claraMode) && (
        <div className="m-1">
          <Accordion items={categoryItems} />
        </div>
      )}

      {/* スプレッド選択アコーディオン */}
      <div className="m-1">
        <Accordion items={spreadItems} />
      </div>

      {/* 占いを始めるボタン */}
      <div className="fixed-action-button">
        <button
          className="w-full py-4 bg-gradient-to-r
              from-purple-500 to-pink-500 text-white rounded-xl
                font-bold text-lg shadow-2xl hover:from-purple-600
              hover:to-pink-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          onClick={handleStartReading}
          disabled={isDisabled}
        >
          {"✨ 占いを始める ✨"}
        </button>

        <div className="text-center text-xs text-black bg-purple-200 bg-opacity-50 rounded-lg px-2 py-1 mt-2 backdrop-blur-sm">
          {claraMode
            ? "📖 Clara といつでも占えます"
            : isLimitReached
            ? "本日の占い回数上限に達しました"
            : `今日はあと${remaining}回`}
        </div>
      </div>
    </>
  );
};

export default CategorySpreadSelector;
