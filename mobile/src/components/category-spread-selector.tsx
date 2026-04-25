import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import SpotlightCoachMark from "../../../shared/components/ui/spotlight-coach-mark";
import type {
  ReadingCategory,
  Spread,
  SpreadToCategory,
} from "../../../shared/lib/types";
import { useClient } from "../lib/hooks/use-client";
import { useMaster } from "../lib/hooks/use-master";
import { useReading } from "../lib/hooks/use-reading";
import { CLARA_CATEGORY_NOS } from "../lib/utils/offline-reading";
import Accordion, { type AccordionItem } from "./accordion";
import ScrollableRadioSelector from "./scrollable-radio-selector";

interface CategorySpreadSelectorProps {
  handleStartReading: () => void;
  claraMode?: boolean; // いつでも占いモード：プラン制限なし・全カテゴリ・全スプレッド
  /**
   * セクション全体が画面内に完全に収まって、かつスクロールが一定時間止まった
   * タイミングで 1 回だけ呼ばれる。ボタン直後のセンチネル要素に IntersectionObserver
   * を当てて「完全可視」を検知し、さらに scroll 停止判定で確実に落ち着いてから発火する。
   */
  onFullyVisible?: () => void;
  /**
   * コーチマークのスポットライト対象となる「セレクター領域」要素を親に通知する。
   * セレクター領域 = カテゴリ/スプレッドのアコーディオンだけを囲む内側 div。
   * 「占いを始める」ボタンや利用回数テキストは含めない（強調対象を絞るため）。
   * null 通知はアンマウント時。
   */
  onCoachTargetElChange?: (el: HTMLElement | null) => void;
  /** プラン変更中 or プラン失効通知が表示中か（クイック占いコーチマーク発火ブロック用） */
  isPlanDialogShowing?: boolean;
  /** サロン画面ライフサイクルで「既に一度コーチマークを出したか」を保持する sticky ref */
  coachShownRef?: React.MutableRefObject<boolean>;
  /** コーチマークが現在表示中か（quick-page で hoist） */
  coachMarkOpen?: boolean;
  setCoachMarkOpen?: (open: boolean) => void;
}

const CategorySpreadSelector: React.FC<CategorySpreadSelectorProps> = ({
  handleStartReading: onHandleStartReading,
  claraMode = false,
  onFullyVisible,
  onCoachTargetElChange,
  isPlanDialogShowing = false,
  coachShownRef,
  coachMarkOpen = false,
  setCoachMarkOpen,
}) => {
  const { t } = useTranslation();
  const { categories: resolvedCategories, spreads: resolvedSpreads } =
    useMaster();
  const {
    currentPlan,
    remainingReadings,
    remainingPersonal,
    quickOnboardedAt,
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
    selectedTargetMode,
    customQuestion,
    setCustomQuestion,
  } = useReading();
  const rawSelectedCategory = isPersonal ? personalCategory : quickCategory;
  const setSelectedCategory = isPersonal ? setPersonalCategory : setQuickCategory;
  const rawSelectedSpread = isPersonal ? personalSpread : quickSpread;
  const setSelectedSpread = isPersonal ? setPersonalSpread : setQuickSpread;
  // reading store に保存された Category / Spread は保存時点の言語版オブジェクト
  // (id だけは言語非依存)。現在言語に合わせて resolved* から引き直す。
  const selectedCategory = useMemo(() => {
    if (!rawSelectedCategory) return null;
    return (
      resolvedCategories.find((c) => c.id === rawSelectedCategory.id) ??
      rawSelectedCategory
    );
  }, [rawSelectedCategory, resolvedCategories]);
  const selectedSpread = useMemo(() => {
    if (!rawSelectedSpread) return null;
    return (
      resolvedSpreads.find((s) => s.id === rawSelectedSpread.id) ??
      rawSelectedSpread
    );
  }, [rawSelectedSpread, resolvedSpreads]);

  // コーチマークのスポットライト対象: カテゴリ/スプレッドのアコーディオンだけを囲む内側 div。
  // 最外 div にするとボタン・利用回数テキストまで強調範囲に入り、暗幕が画面下半分に回らなくなる。
  // クイック占いコーチマーク（本コンポーネント内）とパーソナル占い Stage2 コーチマーク（personal-page.tsx）の両方から参照される。
  const [selectorAreaEl, setSelectorAreaEl] = useState<HTMLDivElement | null>(null);
  const selectorAreaRefCallback = useCallback(
    (el: HTMLDivElement | null) => {
      setSelectorAreaEl(el);
      onCoachTargetElChange?.(el);
    },
    [onCoachTargetElChange]
  );

  // クイック占いコーチマークの発火条件:
  //   a: !quickOnboardedAt          (未完了)
  //   b: !isPlanDialogShowing       (プラン変更中/失効ダイアログなし)
  //   c: selectedTargetMode !== "tarotist"  (portrait モード = セレクタ表示中)
  //   d: !coachShownRef.current     (サロンライフサイクルで未表示)
  //   e: !coachMarkOpen             (現在表示中でない)
  //   + !isPersonal && !claraMode
  const shouldShowQuickCoach =
    !isPersonal &&
    !claraMode &&
    !quickOnboardedAt &&
    !isPlanDialogShowing &&
    selectedTargetMode !== "tarotist" &&
    !!coachShownRef &&
    !coachShownRef.current &&
    !coachMarkOpen &&
    !!setCoachMarkOpen;

  useEffect(() => {
    if (shouldShowQuickCoach && coachShownRef && setCoachMarkOpen) {
      coachShownRef.current = true;
      setCoachMarkOpen(true);
    }
  }, [shouldShowQuickCoach, coachShownRef, setCoachMarkOpen]);

  const handleQuickCoachDismiss = () => {
    setCoachMarkOpen?.(false);
    // markOnboarded("quick") はここでは呼ばない（reading-page の Stage2 完了で立てる）
  };

  // セクション直後のセンチネルを IntersectionObserver で監視し、
  // 「完全可視」+「スクロール停止（= 対象位置が動いていない）」の両方を満たした
  // タイミングで `onFullyVisible` を 1 回だけ呼ぶ。
  //
  // 既存仕様: センチネルはボタン直後に配置されているため、センチネルが完全可視
  //           であればセクション全体のボタン下端まで画面内にある、と見なせる。
  //
  // ── なぜ scroll event で debounce しないか ──────────────────────────────
  // iOS Safari のモメンタム（慣性）スクロールは、ユーザーが指を離してからも
  // scroll event を 1〜3 秒間発火し続ける。scroll event を使った settle timer では
  // 「最後の scroll event から Nms」になるため、モメンタム持続時間ぶん
  // ＋ settle 時間だけ待ち続けることになり UX が著しく遅く感じる。
  //
  // ── 代わりに rAF + rect の stability で停止判定する ───────────────────
  // 毎フレーム getBoundingClientRect().top を取り、前フレームと差が ~0 なら
  // 「動いていない」とみなす。モメンタム中は毎フレーム top が変化するので発火せず、
  // モメンタムが物理的に停止した瞬間にすぐ（数フレーム = 数十 ms で）発火する。
  // これによりユーザーの待ち時間 = モメンタム自体の持続時間のみ、になる。
  //
  // ── flash-dismiss 防止の多重ガード ─────────────────────────────────
  // 実体験で「スクロール中に一瞬表示されて即 dismiss」される事象があった
  // （最初の実装はこれを 300ms settle で防いでいた）。この実装では以下を併用:
  //   1) rect 安定検知（ここ）: モメンタム中は発火自体しない
  //   2) SpotlightCoachMark 側の `pointerActivationDelayMs` (既定 300ms):
  //      フェードイン中は pointer-events:none で誤 dismiss を弾く保険
  // 2) だけでは「モメンタム中にも表示してしまう」ため、1) が本命で 2) は保険。
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasFiredFullyVisibleRef = useRef(false);
  useEffect(() => {
    if (!onFullyVisible) return;
    const el = sentinelRef.current;
    if (!el) return;

    let isIntersecting = false;
    let rafId: number | null = null;
    let lastTop: number | null = null;
    let stableFrames = 0;
    // 3 フレーム = 約 50ms 停止を「静止」とみなす。短すぎるとチラつきで誤判定、
    // 長すぎると発火が遅れる。60fps 基準で 3〜4 フレームが経験的に良い塩梅。
    const REQUIRED_STABLE_FRAMES = 3;
    // 浮動小数のジッター吸収しきい値 (px)。iOS の subpixel 描画で
    // ごく微小な差分が出ることがあるため 0.5px を許容。
    const STABLE_THRESHOLD_PX = 0.5;

    const stopRaf = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastTop = null;
      stableFrames = 0;
    };

    const tick = () => {
      rafId = null;
      if (!isIntersecting || hasFiredFullyVisibleRef.current) return;
      const r = el.getBoundingClientRect();
      if (lastTop !== null && Math.abs(r.top - lastTop) < STABLE_THRESHOLD_PX) {
        stableFrames++;
        if (stableFrames >= REQUIRED_STABLE_FRAMES) {
          hasFiredFullyVisibleRef.current = true;
          onFullyVisible();
          return;
        }
      } else {
        stableFrames = 0;
      }
      lastTop = r.top;
      rafId = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isIntersecting = entry.isIntersecting;
          if (isIntersecting) {
            // 既に rAF ループ稼働中なら何もしない（二重起動防止）
            if (rafId === null && !hasFiredFullyVisibleRef.current) {
              lastTop = null;
              stableFrames = 0;
              rafId = requestAnimationFrame(tick);
            }
          } else {
            // 不可視になったらループ停止。再度可視になったら再開する。
            stopRaf();
          }
        }
      },
      { threshold: 1.0 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      stopRaf();
    };
  }, [onFullyVisible]);

  // カテゴリーの取得とフィルタリング
  // resolvedCategories は現在の UI 言語 (ja/en) に解決済み。
  // フィルタ条件は言語非依存の `category.no` を使う (category.name は表示用で
  // EN モードでは "Love" 等に変わるため identity 判定に使うと壊れる)。
  const availableCategories = useMemo(() => {
    if (!resolvedCategories) return [];
    // 並び順固定のために no でソート (decorator/resolver は元順序を壊さないが念のため)
    const GUEST_FREE_CATEGORY_NOS = [1, 2, 3]; // 恋愛, 仕事, 今日の運勢
    return (
      resolvedCategories
        .filter((category: ReadingCategory) => {
          // claraMode: meanings に対応する4カテゴリのみ（love/career/health/money）
          if (claraMode)
            return (CLARA_CATEGORY_NOS as readonly number[]).includes(
              category.no,
            );
          // GUESTとFREEは、恋愛・仕事・今日の運勢のみ表示
          if (currentPlan!.code === "GUEST" || currentPlan!.code === "FREE") {
            return GUEST_FREE_CATEGORY_NOS.includes(category.no);
          }
          return true;
        })
        // bioプロパティをdescriptionからコピー
        .map((category: ReadingCategory) => ({
          ...category,
          bio: category.description,
        }))
    );
  }, [resolvedCategories, currentPlan, claraMode]);

  const categoryItems: AccordionItem[] = [
    {
      id: "category",
      title: t("reading.categoryTitle", {
        name: selectedCategory?.name || t("reading.pleaseSelect"),
      }),
      subtitle: selectedCategory ? selectedCategory.description : undefined,
      icon: "🎴",
      content: (
        <ScrollableRadioSelector
          title={t("reading.pickCategory")}
          items={availableCategories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          maxVisibleItems={3}
        />
      ),
    },
  ];

  // スプレッドの取得とフィルタリング
  // resolvedSpreads は現在の UI 言語に解決済み。
  // カテゴリ一致判定は言語非依存の id (stc.categoryId / stc.category.id) を使う。
  const availableSpreads = useMemo(() => {
    if (!resolvedSpreads) return [];

    return resolvedSpreads
      .filter((spread: Spread) => {
        // spread.plan, spread.categoriesが存在しない場合はfalse(データ破損)
        if (!isPersonal) {
          if (!spread.categories) return false;
          // 言語非依存の categoryId でマッチング
          const spreadCategoryIds = spread.categories
            .map((stc: SpreadToCategory) => stc.categoryId ?? stc.category?.id)
            .filter(Boolean);
          const targetCategoryId = selectedCategory?.id ?? "";
          if (claraMode) {
            // claraMode: 未リリースプラン (plan.isActive=false) のスプレッドは除外。
            // 現在プラン以下には絞らず、全リリース済みスプレッドを予行演習として開放。
            if (!spread.plan?.isActive) return false;
            return spreadCategoryIds.includes(targetCategoryId);
          }
          if (!spread.plan || !currentPlan) return false;
          if (
            currentPlan.no >= spread.plan!.no &&
            spreadCategoryIds.includes(targetCategoryId)
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
    resolvedSpreads,
    selectedCategory?.id,
  ]);

  const spreadItems: AccordionItem[] = [
    {
      id: "spread",
      title: t("reading.spreadTitle", {
        name: selectedSpread?.name || t("reading.pleaseSelect"),
      }),
      subtitle: selectedSpread
        ? selectedSpread.guide ||
          t("reading.spreadCardCount", {
            count: selectedSpread.cells?.length || 0,
          })
        : undefined,
      icon: "🎯",
      content: (
        <ScrollableRadioSelector
          title={t("reading.pickSpread")}
          subtitle={t("reading.pickSpreadNote")}
          items={availableSpreads}
          selected={selectedSpread}
          onSelect={setSelectedSpread}
          maxVisibleItems={3}
        />
      ),
    },
  ];

  useEffect(() => {
    console.log("[QuickPage] availableCategories changed", availableCategories);
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
    console.log("[QuickPage] availableSpreads changed", availableSpreads);
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
    <div>
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
          {isPersonal
            ? t("reading.pickSpreadOnly")
            : claraMode
              ? t("reading.pickCategoryAndSpread")
              : t("reading.askAnything")}
        </span>
      </motion.div>

      {/* コーチマーク強調対象: カテゴリ/スプレッドのアコーディオンと入力欄を囲む。
          入力欄もチュートリアル時に強調範囲に入るよう同じラッパー内に置く。 */}
      <div ref={selectorAreaRefCallback}>
        {/* カテゴリー選択アコーディオン（入力補助としてクイック占いでも表示）
            personal モード（!isPersonal が false）のみ非表示。 */}
        {(!isPersonal || claraMode) && (
          <div className="m-1">
            <Accordion items={categoryItems} />
          </div>
        )}

        {/* クイック占い: 自由入力欄（任意）。
            空のままなら上のジャンル選択で占う。
            書き込めばその文章が customQuestion として AI に届き、優先される。
            ジャンルチップの下に置くことで「チップ＝入力補助」の関係を視覚化。 */}
        {!isPersonal && !claraMode && (
          <div className="m-1">
            <textarea
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder={t("reading.questionPlaceholder")}
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border border-purple-200 bg-white/90 backdrop-blur-sm px-4 py-3 text-base text-gray-800 placeholder-gray-400 shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
            />
          </div>
        )}

        {/* スプレッド選択アコーディオン */}
        <div className="m-1">
          <Accordion items={spreadItems} />
        </div>
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
          {t("reading.startReading")}
        </button>

        <div className="text-center text-xs text-black bg-purple-200 bg-opacity-50 rounded-lg px-2 py-1 mt-2 backdrop-blur-sm">
          {claraMode
            ? t("reading.claraAlways")
            : isLimitReached
            ? t("reading.dailyLimitReached")
            : t("reading.remainingToday", { count: remaining ?? 0 })}
        </div>

        {/* セクション下端のセンチネル: 完全可視 + スクロール停止を両方満たす検知に使用 */}
        <div
          ref={sentinelRef}
          aria-hidden="true"
          className="h-px w-full pointer-events-none"
        />
      </div>

      {/* クイック占い初回のコーチマーク: セレクター領域のみ明るく照らす */}
      <SpotlightCoachMark
        isOpen={coachMarkOpen}
        targetEl={selectorAreaEl}
        title={t("reading.coachTitle")}
        note={t("reading.coachNote")}
        dismissHint={t("common.tapToDismiss")}
        onDismiss={handleQuickCoachDismiss}
        openDelayMs={400}
      />
    </div>
  );
};

export default CategorySpreadSelector;
