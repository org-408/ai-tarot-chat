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
import Accordion, { type AccordionItem } from "./accordion";
import ScrollableRadioSelector from "./scrollable-radio-selector";

interface CategorySpreadSelectorProps {
  handleStartReading: () => void;
}

const CategorySpreadSelector: React.FC<CategorySpreadSelectorProps> = ({
  handleStartReading: onHandleStartReading,
}) => {
  const { masterData } = useMaster();
  const { currentPlan, remainingReadings, remainingCeltics, remainingPersonal, isReadingInProgress } =
    useClient();
  const {
    selectedCategory,
    setSelectedCategory,
    selectedSpread,
    setSelectedSpread,
    isPersonal,
  } = useSalon();

  // カテゴリーの取得とフィルタリング
  const availableCategories = useMemo(() => {
    if (!masterData.categories) return [];

    return (
      masterData.categories
        .filter((category: ReadingCategory) => {
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
  }, [masterData, currentPlan]);

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
    if (!masterData.spreads || !currentPlan || !masterData.categories)
      return [];

    return masterData.spreads
      .filter((spread: Spread) => {
        // spread.plan, spread.categoriesが存在しない場合はfalse(データ破損)
        if (!isPersonal) {
          if (!spread.plan || !spread.categories) return false;
          // スプレッド内のカテゴリー一覧にselectedCategoryが含まれているか
          // (TODO: カテゴリー一覧は目安として全選択すべきか検討)
          const spreadCatetories = spread.categories.map(
            (stc: SpreadToCategory) => stc.category?.name
          );
          if (
            currentPlan.no >= spread.plan!.no &&
            spreadCatetories.includes(selectedCategory?.name || "")
          ) {
            return true;
          }
        } else {
          // パーソナル占いモードの場合、スプレッドのプラン条件とカテゴリー条件は無視する
          return true;
        }
      })
      .map((spread: Spread) => ({ ...spread, bio: spread.guide }));
  }, [
    currentPlan,
    isPersonal,
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
    if (availableCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(selectedCategory || availableCategories[0]);
    }
  }, [availableCategories, selectedCategory, setSelectedCategory]);

  useEffect(() => {
    console.log("[SalonPage] availableSpreads changed", availableSpreads);
    if (availableSpreads.length > 0 && !selectedSpread) {
      setSelectedSpread(selectedSpread || availableSpreads[0]);
    }
  }, [availableSpreads, selectedSpread, setSelectedSpread]);

  const isCeltic = selectedSpread?.code?.toLowerCase().includes("celtic") ?? false;
  const remaining = isPersonal
    ? remainingPersonal
    : isCeltic
    ? remainingCeltics
    : remainingReadings;
  const isLimitReached = remaining !== undefined && remaining <= 0;

  const isDisabled =
    isLimitReached ||
    isReadingInProgress ||
    !selectedSpread ||
    (!isPersonal && !selectedCategory);

  const handleStartReading = () => {
    if (isDisabled) return;
    onHandleStartReading();
    // ストアに保存(念のため、nullガード付き)
    setSelectedCategory(selectedCategory || availableCategories[0]);
    setSelectedSpread(selectedSpread || availableSpreads[0]);
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
      {!isPersonal && (
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
          {isReadingInProgress
            ? "占い中..."
            : isLimitReached
            ? "本日の占い回数上限に達しました"
            : `今日はあと${remaining}回`}
        </div>
      </div>
    </>
  );
};

export default CategorySpreadSelector;
