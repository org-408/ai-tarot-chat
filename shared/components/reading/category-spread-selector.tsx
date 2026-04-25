import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Plan,
  ReadingCategory,
  Spread,
  SpreadToCategory,
} from "../../lib/types";
import type { AccordionItem } from "../ui/accordion";
import { Accordion } from "../ui/accordion";
import { ScrollableRadioSelector } from "../ui/scrollable-radio-selector";

interface CategorySpreadSelectorLabels {
  /** トップに表示するプロンプト (パーソナル占いモード用) */
  selectSpreadPrompt?: string;
  /** トップに表示するプロンプト (クイック占いモード用) */
  selectCategoryAndSpreadPrompt?: string;
  /** アコーディオンタイトルのジャンルラベル prefix。例: "ジャンル" */
  categoryLabel?: string;
  /** アコーディオンタイトルのスプレッドラベル prefix。例: "スプレッド" */
  spreadLabel?: string;
  /** 未選択時のプレースホルダー。例: "選択してください" */
  selectPlaceholder?: string;
  /** ジャンル選択リストのタイトル */
  categoryQuestion?: string;
  /** スプレッド選択リストのタイトル */
  spreadQuestion?: string;
  /** スプレッド選択リストのサブタイトル */
  spreadSubtitle?: string;
  /** 占い開始ボタンのテキスト */
  startReading?: string;
  /** 利用回数上限時のテキスト */
  limitReached?: string;
  /** 残り回数テキスト (親が count を含む書式済み文字列を渡す) */
  remainingText?: string;
  /** disabled=true 時に表示する理由テキスト */
  disabledMessage?: string;
}

interface CategorySpreadSelectorProps {
  categories: ReadingCategory[];
  spreads: Spread[];
  currentPlan?: Plan | null;
  /** パーソナル占いモード。true の場合カテゴリー選択を非表示 */
  isPersonal?: boolean;
  /** 残り利用回数。0 以下の場合はボタンを無効化 */
  remainingCount?: number;
  /** 外部から追加で無効化する条件（例: 占い師未選択）。内部の無効化条件と OR で評価 */
  disabled?: boolean;
  /**
   * 初期選択カテゴリ。保存済みの前回カテゴリ復元などに使う。
   */
  initialCategory?: ReadingCategory | null;
  /**
   * 初期選択スプレッド。指定されていれば availableSpreads[0] の代わりに
   * これを初期値として使用する。主にパーソナル占いの AI 推薦スプレッドを
   * デフォルト選択にするため。以降はユーザー操作で自由に変更可能。
   */
  initialSpread?: Spread | null;
  /** 占い開始ボタンのコールバック */
  onStartReading: (params: {
    category: ReadingCategory | null;
    spread: Spread;
  }) => void;
  /** UI テキスト。プラットフォームごとに翻訳済み文字列を渡す */
  labels?: CategorySpreadSelectorLabels;
}

/**
 * カテゴリー & スプレッド選択コンポーネント。
 * プラットフォーム非依存 (useReading/useMaster なし)。
 */
export const CategorySpreadSelector: React.FC<
  CategorySpreadSelectorProps
> = ({
  categories,
  spreads,
  currentPlan,
  isPersonal = false,
  remainingCount,
  disabled: externalDisabled = false,
  initialCategory,
  initialSpread,
  onStartReading,
  labels = {},
}) => {
  const {
    selectSpreadPrompt = "スプレッドを選んでください",
    selectCategoryAndSpreadPrompt = "占うジャンルとスプレッドを選んでください",
    categoryLabel = "ジャンル",
    spreadLabel = "スプレッド",
    selectPlaceholder = "選択してください",
    categoryQuestion = "どのジャンルを占いますか?",
    spreadQuestion = "どのスプレッドで占いますか？",
    spreadSubtitle = "(カテゴリごとに選択肢が変わります)",
    startReading = "✨ 占いを始める ✨",
    limitReached = "本日の占い回数上限に達しました",
    remainingText,
    disabledMessage,
  } = labels;

  const [selectedCategory, setSelectedCategory] =
    useState<ReadingCategory | null>(null);
  const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null);
  const didUserSelectCategoryRef = useRef(false);
  const didUserSelectSpreadRef = useRef(false);

  // カテゴリーの初期化
  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategory(null);
      return;
    }

    if (
      initialCategory &&
      categories.some((c) => c.id === initialCategory.id) &&
      (!didUserSelectCategoryRef.current ||
        !selectedCategory ||
        selectedCategory.id !== initialCategory.id)
    ) {
      setSelectedCategory(initialCategory);
      return;
    }

    if (!selectedCategory) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, initialCategory, selectedCategory]);

  // 選択カテゴリが一覧から外れたら先頭にリセット
  useEffect(() => {
    if (
      selectedCategory &&
      !categories.some((c) => c.id === selectedCategory.id)
    ) {
      const fallbackCategory =
        initialCategory &&
        categories.some((c) => c.id === initialCategory.id)
          ? initialCategory
          : (categories[0] ?? null);
      setSelectedCategory(fallbackCategory);
      didUserSelectCategoryRef.current = false;
    }
  }, [categories, initialCategory, selectedCategory]);

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
  // initialSpread が指定されていて、かつ availableSpreads に含まれていれば
  // それを初期選択値として使う（AI 推薦のスプレッドをデフォルト表示する用途）。
  useEffect(() => {
    if (availableSpreads.length === 0) {
      setSelectedSpread(null);
      return;
    }

    const preferredSpread =
      initialSpread &&
      availableSpreads.some((s) => s.id === initialSpread.id)
        ? availableSpreads.find((s) => s.id === initialSpread.id)!
        : availableSpreads[0];

    if (
      initialSpread &&
      preferredSpread.id === initialSpread.id &&
      (!didUserSelectSpreadRef.current ||
        !selectedSpread ||
        selectedSpread.id !== initialSpread.id)
    ) {
      setSelectedSpread(preferredSpread);
      return;
    }

    if (!selectedSpread) {
      setSelectedSpread(preferredSpread);
      return;
    }

    if (!availableSpreads.some((s) => s.id === selectedSpread.id)) {
      setSelectedSpread(preferredSpread);
      didUserSelectSpreadRef.current = false;
    }
  }, [availableSpreads, selectedSpread, initialSpread]);

  const isLimitReached =
    remainingCount !== undefined && remainingCount <= 0;

  const isDisabled =
    externalDisabled ||
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
      title: `${categoryLabel}: ${selectedCategory?.name ?? selectPlaceholder}`,
      subtitle: selectedCategory?.description,
      icon: "🎴",
      content: (
        <ScrollableRadioSelector
          title={categoryQuestion}
          items={categories.map((c) => ({ ...c, bio: c.description }))}
          selected={selectedCategory}
          onSelect={(category) => {
            didUserSelectCategoryRef.current = true;
            setSelectedCategory(category as ReadingCategory);
          }}
          maxVisibleItems={3}
        />
      ),
    },
  ];

  const spreadItems: AccordionItem[] = [
    {
      id: "spread",
      title: `${spreadLabel}: ${selectedSpread?.name ?? selectPlaceholder}`,
      subtitle: selectedSpread
        ? (selectedSpread.guide ??
          `使用するタロットカード枚数: ${selectedSpread.cells?.length ?? 0}枚`)
        : undefined,
      icon: "🎯",
      content: (
        <ScrollableRadioSelector
          title={spreadQuestion}
          subtitle={spreadSubtitle}
          items={availableSpreads}
          selected={selectedSpread}
          onSelect={(s) => {
            didUserSelectSpreadRef.current = true;
            setSelectedSpread(s as Spread);
          }}
          maxVisibleItems={3}
        />
      ),
    },
  ];

  const bottomText = externalDisabled && disabledMessage
    ? disabledMessage
    : isLimitReached
    ? limitReached
    : (remainingText ?? "");

  return (
    <>
      {/* プロンプト */}
      <motion.div
        className="text-center py-4"
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        <span className="text-gray-800 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-md text-sm">
          {isPersonal ? selectSpreadPrompt : selectCategoryAndSpreadPrompt}
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
          {startReading}
        </button>
        {bottomText && (
          <div className="text-center text-xs text-black bg-purple-200 bg-opacity-50 rounded-lg px-2 py-1 mt-2 backdrop-blur-sm">
            {bottomText}
          </div>
        )}
      </div>
    </>
  );
};
