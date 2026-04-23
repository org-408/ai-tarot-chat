import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import OnboardingOverlay from "../../../shared/components/ui/onboarding-overlay";
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
  /**
   * 「占いを始める」ボタンが画面内に完全に収まった初回タイミングで 1 回だけ呼ばれる。
   * ボタン直後のセンチネル要素に IntersectionObserver を当てている。
   */
  onStartButtonVisible?: () => void;
}

const CategorySpreadSelector: React.FC<CategorySpreadSelectorProps> = ({
  handleStartReading: onHandleStartReading,
  claraMode = false,
  onStartButtonVisible,
}) => {
  const { masterData } = useMaster();
  const {
    currentPlan,
    remainingReadings,
    remainingPersonal,
    quickOnboardedAt,
    markOnboarded,
  } = useClient();
  const {
    quickCategory,
    personalCategory,
    setQuickCategory,
    setPersonalCategory,
    quickSpread,
    personalSpread,
    setQuickSpread,
    setPersonalSpread,
    lastClaraCategoryId,
    lastClaraSpreadId,
    setLastClaraSelection,
    isPersonal,
  } = useSalon();
  const selectedCategory = isPersonal ? personalCategory : quickCategory;
  const setSelectedCategory = isPersonal ? setPersonalCategory : setQuickCategory;
  const selectedSpread = isPersonal ? personalSpread : quickSpread;
  const setSelectedSpread = isPersonal ? setPersonalSpread : setQuickSpread;

  // オンボーディング: クイック占いの初回表示のみ
  // - いつでも占い（claraMode）: クイックで慣れている前提なので対象外
  // - パーソナル占い（isPersonal）: 別経路で制御
  const shouldShowOnboarding =
    !isPersonal && !claraMode && !quickOnboardedAt;
  const [overlayVisible, setOverlayVisible] = useState(false);
  useEffect(() => {
    if (shouldShowOnboarding) setOverlayVisible(true);
  }, [shouldShowOnboarding]);
  const handleOverlayDismiss = () => {
    setOverlayVisible(false);
    if (!quickOnboardedAt) {
      // fire-and-forget: 失敗しても UX を止めない
      void markOnboarded("quick");
    }
  };

  // 「占いを始める」ボタン直後のセンチネルを IntersectionObserver で監視し、
  // 画面内に入った初回タイミングで `onStartButtonVisible` を呼ぶ（パーソナル Stage2 用）。
  const startButtonSentinelRef = useRef<HTMLDivElement | null>(null);
  const hasFiredStartVisibleRef = useRef(false);
  useEffect(() => {
    if (!onStartButtonVisible) return;
    const el = startButtonSentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasFiredStartVisibleRef.current) {
            hasFiredStartVisibleRef.current = true;
            onStartButtonVisible();
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onStartButtonVisible]);

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
  // claraModeおよびdebugModeは回数制限なし（isPersonal問わず）
  const isLimitReached = !claraMode && !debugMode && remaining !== undefined && remaining <= 0;

  const isDisabled =
    isLimitReached ||
    !selectedSpread ||
    ((!isPersonal || claraMode) && !selectedCategory);

  const handleStartReading = () => {
    if (isDisabled) return;
    const categoryToUse = selectedCategory || availableCategories[0];
    const spreadToUse =
      availableSpreads.find((s) => s.id === selectedSpread?.id) ??
      availableSpreads[0];

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
      <div className="px-1 pb-4 mt-2">
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

        {/* ボタン直後のセンチネル: 画面に収まった瞬間を検知 (onStartButtonVisible 用) */}
        <div
          ref={startButtonSentinelRef}
          aria-hidden="true"
          className="h-px w-full pointer-events-none"
        />
      </div>

      <OnboardingOverlay
        isOpen={overlayVisible}
        title={"占いたいジャンルとスプレッドを\n選んでください"}
        note={"スプレッドはタロットカードの配置パターンです。\nジャンルに合わせて選べます。"}
        onDismiss={handleOverlayDismiss}
      />
    </>
  );
};

export default CategorySpreadSelector;
