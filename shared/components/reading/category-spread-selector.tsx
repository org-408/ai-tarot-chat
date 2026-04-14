import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type {
  Plan,
  ReadingCategory,
  Spread,
  SpreadToCategory,
} from "../../lib/types";
import type { AccordionItem } from "../ui/accordion";
import { Accordion } from "../ui/accordion";
import { ScrollableRadioSelector } from "../ui/scrollable-radio-selector";

interface CategorySpreadSelectorProps {
  categories: ReadingCategory[];
  spreads: Spread[];
  currentPlan?: Plan | null;
  /** パーソナル占いモード。true の場合カテゴリー選択を非表示 */
  isPersonal?: boolean;
  /** 残り利用回数。0 以下の場合はボタンを無効化 */
  remainingCount?: number;
  /** 占い開始ボタンのコールバック */
  onStartReading: (params: {
    category: ReadingCategory | null;
    spread: Spread;
  }) => void;
}

/**
 * カテゴリー & スプレッド選択コンポーネント。
 * プラットフォーム非依存 (useSalon/useMaster なし)。
 */
export const CategorySpreadSelector: React.FC<
  CategorySpreadSelectorProps
> = ({
  categories,
  spreads,
  currentPlan,
  isPersonal = false,
  remainingCount,
  onStartReading,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<ReadingCategory | null>(null);
  const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null);

  // カテゴリーの初期化
  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  // 選択カテゴリが一覧から外れたら先頭にリセット
  useEffect(() => {
    if (
      selectedCategory &&
      !categories.some((c) => c.id === selectedCategory.id)
    ) {
      setSelectedCategory(categories[0] ?? null);
    }
  }, [categories, selectedCategory]);

  // 利用可能スプレッドのフィルタリング
  const availableSpreads = useMemo(() => {
    return spreads
      .filter((spread) => {
        // プラン制限
        if (currentPlan && spread.plan && currentPlan.no < spread.plan.no) {
          return false;
        }
        // パーソナル占いはカテゴリー条件なし
        if (isPersonal) return true;
        // クイック占い: 選択カテゴリが含まれるスプレッドのみ
        if (!spread.categories || !selectedCategory) return false;
        const spreadCategories = spread.categories.map(
          (stc: SpreadToCategory) => stc.category?.name,
        );
        return spreadCategories.includes(selectedCategory.name);
      })
      .map((s) => ({ ...s, bio: s.guide }));
  }, [spreads, currentPlan, isPersonal, selectedCategory]);

  // スプレッドの初期化・リセット
  useEffect(() => {
    if (!selectedSpread && availableSpreads.length > 0) {
      setSelectedSpread(availableSpreads[0]);
      return;
    }
    if (
      selectedSpread &&
      !availableSpreads.some((s) => s.id === selectedSpread.id)
    ) {
      setSelectedSpread(availableSpreads[0] ?? null);
    }
  }, [availableSpreads, selectedSpread]);

  const isLimitReached =
    remainingCount !== undefined && remainingCount <= 0;

  const isDisabled =
    isLimitReached ||
    !selectedSpread ||
    (!isPersonal && !selectedCategory);

  const handleStart = () => {
    if (isDisabled || !selectedSpread) return;
    onStartReading({
      category: isPersonal ? null : (selectedCategory ?? null),
      spread: selectedSpread,
    });
  };

  // Accordion items
  const categoryItems: AccordionItem[] = [
    {
      id: "category",
      title: `ジャンル: ${selectedCategory?.name ?? "選択してください"}`,
      subtitle: selectedCategory?.description,
      icon: "🎴",
      content: (
        <ScrollableRadioSelector
          title="どのジャンルを占いますか?"
          items={categories.map((c) => ({ ...c, bio: c.description }))}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          maxVisibleItems={3}
        />
      ),
    },
  ];

  const spreadItems: AccordionItem[] = [
    {
      id: "spread",
      title: `スプレッド: ${selectedSpread?.name ?? "選択してください"}`,
      subtitle: selectedSpread
        ? (selectedSpread.guide ??
          `使用するタロットカード枚数: ${selectedSpread.cells?.length ?? 0}枚`)
        : undefined,
      icon: "🎯",
      content: (
        <ScrollableRadioSelector
          title="どのスプレッドで占いますか？"
          subtitle="(カテゴリごとに選択肢が変わります)"
          items={availableSpreads}
          selected={selectedSpread}
          onSelect={(s) => setSelectedSpread(s as Spread)}
          maxVisibleItems={3}
        />
      ),
    },
  ];

  return (
    <>
      {/* プロンプト */}
      <motion.div
        className="text-center py-4"
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        <span className="text-gray-800 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-md text-sm">
          {isPersonal
            ? "スプレッドを選んでください"
            : "占うジャンルとスプレッドを選んでください"}
        </span>
      </motion.div>

      {/* カテゴリー選択 */}
      {!isPersonal && (
        <div className="m-1">
          <Accordion items={categoryItems} />
        </div>
      )}

      {/* スプレッド選択 */}
      <div className="m-1">
        <Accordion items={spreadItems} />
      </div>

      {/* 占いを始めるボタン */}
      <div className="px-1 pb-2">
        <button
          type="button"
          onClick={handleStart}
          disabled={isDisabled}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg shadow-2xl hover:from-purple-600 hover:to-pink-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          ✨ 占いを始める ✨
        </button>
        <div className="text-center text-xs text-black bg-purple-200 bg-opacity-50 rounded-lg px-2 py-1 mt-2 backdrop-blur-sm">
          {isLimitReached
            ? "本日の占い回数上限に達しました"
            : remainingCount !== undefined
              ? `今日はあと${remainingCount}回`
              : ""}
        </div>
      </div>
    </>
  );
};
