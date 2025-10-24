import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type {
  AppJWTPayload,
  MasterData,
  Plan,
  ReadingCategory,
  Spread,
  SpreadToCategory,
  Tarotist,
  UsageStats,
} from "../../../shared/lib/types";
import { useSalonStore } from "../lib/stores/salon";
import type { SelectMode, UserPlan } from "../types";
import Accordion, { type AccordionItem } from "./accordion";
import ScrollableRadioSelector from "./scrollable-radio-selector";
import TarotistCarouselPortrait from "./tarotist-carousel-portrait";

interface SalonPageProps {
  payload: AppJWTPayload;
  currentPlan: Plan;
  masterData: MasterData;
  usageStats: UsageStats;
  onChangePlan: (plan: UserPlan) => void;
  onStartReading: (
    tarotist: Tarotist,
    spread: Spread,
    category: ReadingCategory
  ) => void;
  isChangingPlan: boolean;
}

const SalonPage: React.FC<SalonPageProps> = ({
  payload,
  currentPlan,
  masterData,
  usageStats,
  onChangePlan,
  onStartReading,
  isChangingPlan,
}) => {
  const {
    lastTarotist,
    lastCategory,
    lastSpread,
    setLastTarotist,
    setLastCategory,
    setLastSpread,
  } = useSalonStore();

  const [selectedCategory, setSelectedCategory] =
    useState<ReadingCategory | null>(null);
  const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null);
  const [selectedTarotist, setSelectedTarotist] = useState<Tarotist | null>();
  const [userInput, setUserInput] = useState<string>("");
  const [selectMode, setSelectMode] = useState<SelectMode>(
    lastTarotist ? "portrait" : "tarotist"
  );

  // 1. 占い師の取得とフィルタリング
  const availableTarotists = useMemo(() => {
    if (!masterData.tarotists || !currentPlan) return [];

    return masterData.tarotists.filter((tarotist: Tarotist) => {
      // 現在のプラン番号以下の占い師のみ表示
      const tarotistPlan = masterData.plans?.find(
        (p: Plan) => p.code === tarotist.plan!.code
      );
      return (
        tarotistPlan &&
        tarotistPlan.no <= (currentPlan!.no || 0) &&
        tarotist.provider !== "OFFLINE" // TODO:OFFLINEプランの占い師は除外
      );
    });
  }, [masterData, currentPlan]);

  // 2 カテゴリーの取得とフィルタリング
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

  useEffect(() => {
    console.log("[SalonPage] isChangingPlan changed", isChangingPlan);
  }, [isChangingPlan]);

  // 3 スプレッドの取得とフィルタリング
  const availableSpreads = useMemo(() => {
    if (!masterData.spreads || !currentPlan || !masterData.categories)
      return [];

    return masterData.spreads
      .filter((spread: Spread) => {
        // spread.plan, spread.categoriesが存在しない場合はfalse(データ破損)
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
      })
      .map((spread: Spread) => ({ ...spread, bio: spread.guide }));
  }, [
    currentPlan,
    masterData.categories,
    masterData.spreads,
    selectedCategory,
  ]);

  const upgradablePlans = masterData!.plans
    ?.filter((p: Plan) => p.no > (currentPlan?.no || 0))
    .sort((a: { no: number }, b: { no: number }) => a.no - b.no);

  // masterDataから色情報を取得する関数
  const getPlanColors = (planCode: string) => {
    const plan = masterData.plans.find((p: Plan) => p.code === planCode);
    if (
      !plan ||
      !plan.primaryColor ||
      !plan.secondaryColor ||
      !plan.accentColor
    ) {
      // フォールバック: デフォルトの色
      return {
        primary: "#F9FAFB",
        secondary: "#E5E7EB",
        accent: "#6B7280",
      };
    }

    return {
      primary: plan.primaryColor,
      secondary: plan.secondaryColor,
      accent: plan.accentColor,
    };
  };

  useMemo(() => {
    console.log("[SalonPage] masterData or usageStats changed", {
      masterData,
      usageStats,
    });
  }, [masterData, usageStats]);

  useEffect(() => {
    console.log("[SalonPage] availableTarotists changed", availableTarotists);
    if (availableTarotists.length > 0 && !selectedTarotist) {
      setSelectedTarotist(lastTarotist || availableTarotists[0]);
    }
  }, [availableTarotists, lastTarotist, selectedTarotist]);

  useEffect(() => {
    console.log("[SalonPage] availableCategories changed", availableCategories);
    if (availableCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(lastCategory || availableCategories[0]);
    }
  }, [availableCategories, lastCategory, selectedCategory]);

  useEffect(() => {
    console.log("[SalonPage] availableSpreads changed", availableSpreads);
    if (availableSpreads.length > 0 && !selectedSpread) {
      setSelectedSpread(lastSpread || availableSpreads[0]);
    }
  }, [availableSpreads, lastSpread, selectedSpread]);

  const handleStartReading = () => {
    if (!selectedTarotist || !selectedSpread || !selectedCategory) return;

    // ストアに保存
    setLastTarotist(selectedTarotist);
    setLastCategory(selectedCategory);
    setLastSpread(selectedSpread);

    onStartReading(selectedTarotist!, selectedSpread, selectedCategory);
  };

  const handleChangePlan = (targetPlan: UserPlan) => {
    onChangePlan(targetPlan);
  };

  const renderStars = (quality: number) => {
    return "⭐️".repeat(quality);
  };

  const getTarotistColor = (tarotist: Tarotist) => {
    const primary = tarotist.primaryColor;
    const secondary = tarotist.secondaryColor;
    const accent = tarotist.accentColor;

    if (primary && secondary && accent) {
      return {
        primary,
        secondary,
        accent,
        bg: primary,
        button: accent,
      };
    }

    const planColors = getPlanColors(tarotist.plan?.code || "GUEST");
    return {
      ...planColors,
      bg: planColors.primary,
      button: planColors.accent,
    };
  };

  return (
    <div className="main-container">
      {/* カレントプラン表示 */}
      {selectMode === "spread" && (
        <CurrentPlanView
          currentPlan={currentPlan}
          payload={payload}
          usageStats={usageStats}
          getPlanColors={getPlanColors}
        />
      )}

      {/* 占い師選択モード */}
      {selectMode === "tarotist" ? (
        <TarotistCarouselPortrait
          availableTarotists={availableTarotists}
          selectedTarotist={selectedTarotist || null}
          setSelectedTarotist={setSelectedTarotist}
          currentPlan={currentPlan}
          getTarotistColor={getTarotistColor}
          renderStars={renderStars}
          onChangePlan={handleChangePlan}
          isChangingPlan={isChangingPlan}
          onSelectTarotist={setSelectedTarotist}
          selectMode={selectMode}
          setSelectMode={setSelectMode}
        />
      ) : (
        <>
          <div
            className="fixed left-0 right-0 h-[45vh] z-10"
            style={{
              top: "calc(50px + env(safe-area-inset-top))",
              maxWidth: "400px",
              margin: "0 auto",
            }}
          >
            {/* 上半分 */}
            {/* 占い師肖像画モード */}
            <TarotistCarouselPortrait
              availableTarotists={availableTarotists}
              selectedTarotist={selectedTarotist || null}
              setSelectedTarotist={setSelectedTarotist}
              currentPlan={currentPlan}
              getTarotistColor={getTarotistColor}
              renderStars={renderStars}
              onChangePlan={handleChangePlan}
              isChangingPlan={isChangingPlan}
              onSelectTarotist={setSelectedTarotist}
              selectMode={selectMode}
              setSelectMode={setSelectMode}
            />
          </div>

          {/* 下半分 */}
          {/* カテゴリー・スプレッド選択 */}
          <div
            style={{ marginTop: "45vh", height: "55vh" }}
            className="overflow-auto pb-20"
          >
            <CategorySpreadSelector
              currentPlan={currentPlan}
              availableCategories={availableCategories}
              availableSpreads={availableSpreads}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedSpread={selectedSpread}
              setSelectedSpread={setSelectedSpread}
              userInput={userInput}
              setUserInput={setUserInput}
            />
          </div>

          {/* 占いを始めるボタン */}
          <div className="fixed-action-button">
            <button
              className="w-full py-4 bg-gradient-to-r
          from-purple-500 to-pink-500 text-white rounded-xl
            font-bold text-lg shadow-2xl hover:from-purple-600
          hover:to-pink-600 active:scale-95 transition-all disabled:opacity-80 disabled:cursor-not-allowed"
              onClick={handleStartReading}
              // disabled={
              //   (currentPlan.no <= 2 && usageStats.remainingReadings <= 0) ||
              //   !selectedSpread ||
              //   !selectedCategory
              // }
            >
              {"✨ 占いを始める ✨"}
            </button>

            {/* {currentPlan.no <= 2 && (
              <div className="text-center text-xs text-black bg-purple-200 bg-opacity-50 rounded-lg px-2 py-1 mt-2 backdrop-blur-sm">
                今日はあと{usageStats.remainingReadings}回
              </div>
            )} */}
          </div>
        </>
      )}

      {/* プランアップグレード案内 */}
      {selectMode !== "tarotist" && (
        <UpgradeGuide
          currentPlan={currentPlan}
          upgradablePlans={upgradablePlans}
          getPlanColors={getPlanColors}
          handleChangePlan={handleChangePlan}
          isChangingPlan={isChangingPlan}
        />
      )}
    </div>
  );
};

export default SalonPage;

interface CategorySpreadSelectorProps {
  currentPlan: Plan;
  availableCategories: ReadingCategory[];
  availableSpreads: Spread[];
  selectedCategory: ReadingCategory | null;
  setSelectedCategory: (category: ReadingCategory) => void;
  selectedSpread: Spread | null;
  setSelectedSpread: (spread: Spread) => void;
  userInput: string;
  setUserInput: (input: string) => void;
}

const CategorySpreadSelector: React.FC<CategorySpreadSelectorProps> = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentPlan,
  availableCategories,
  availableSpreads,
  selectedCategory,
  setSelectedCategory,
  selectedSpread,
  setSelectedSpread,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userInput,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setUserInput,
}) => {
  // const [personalMode, setPersonalMode] = useState<string>("selector");
  // const [aiMode, setAiMode] = useState<string>("ai-auto");

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

  const spreadItems: AccordionItem[] = [
    {
      id: "spread",
      title: `利用するスプレッド: ${
        selectedSpread?.name || "選択してください"
      }`,
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
          占うジャンルとスプレッドを選んでください
        </span>
      </motion.div>

      {/* カテゴリー選択アコーディオン */}
      <Accordion items={categoryItems} />

      {/* スプレッド選択アコーディオン */}
      <Accordion items={spreadItems} />

      {/* 即答・パーソナルモード選択 */}
      {/* {currentPlan?.hasPersonal && (
        <div className="mb-6">
          <div className="section-title">🎴 占い方を選んでください:</div>
          <div className="space-y-2">
            <div
              className={`option-item ${
                personalMode === "selector" ? "selected" : ""
              }`}
              onClick={() => setPersonalMode("selector")}
            >
              <div
                className={`radio-button ${
                  personalMode === "selector" ? "selected" : ""
                }`}
              ></div>
              <div>
                <div>ジャンルを選択する</div>
                <div className="text-xs text-gray-500">
                  ジャンルを選択して占う
                </div>
              </div>
            </div>

            <div
              className={`option-item ${
                personalMode === "personal" ? "selected" : ""
              }`}
              onClick={() => setPersonalMode("personal")}
            >
              <div
                className={`radio-button ${
                  personalMode === "personal" ? "selected" : ""
                }`}
              ></div>
              <div>
                <div>パーソナル占いを選択</div>
                <div className="text-xs text-gray-500">簡易対話形式で占う</div>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {/* パーソナル占い用のユーザー入力欄 */}
      {/* {personalMode === "personal" && (
        <div className="mb-6">
          <div className="section-title">📝 どんなことを占いたいですか?</div>
          <input
            type="text"
            className="text-input"
            placeholder="例:彼との関係がうまくいくか知りたい"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
        </div>
      )} */}

      {/* カテゴリー選択 */}
      {/* {personalMode === "selector" && (
        <ScrollableRadioSelector
          title={"どのジャンルを占いますか?"}
          items={availableCategories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          maxVisibleItems={3}
        />
      )} */}

      {/* TODO: AIモード選択 */}
      {/* {currentPlan?.hasPersonal && (
        <div className="mb-6">
          <div className="section-title">🎴 スプレッドを選んでください:</div>
          <div className="space-y-2">
            <div
              className={`option-item ${
                aiMode === "ai-auto" ? "selected" : ""
              }`}
              onClick={() => setAiMode("ai-auto")}
            >
              <div
                className={`radio-button ${
                  aiMode === "ai-auto" ? "selected" : ""
                }`}
              ></div>
              <div>
                <div>🤖 AIおまかせ</div>
                <div className="text-xs text-gray-500">
                  入力内容から最適なスプレッドを選択
                </div>
              </div>
            </div>

            <div
              className={`option-item ${aiMode === "manual" ? "selected" : ""}`}
              onClick={() => setAiMode("manual")}
            >
              <div
                className={`radio-button ${
                  aiMode === "manual" ? "selected" : ""
                }`}
              ></div>
              <div>🎯 スプレッドを選択</div>
            </div>
          </div>
        </div>
      )} */}

      {/* スプレッド選択 */}
      {/* {aiMode === "manual" && (
        <ScrollableRadioSelector
          title={"🎴 どのスプレッドで占いますか？"}
          subtitle={"(カテゴリごとに選択肢が変わります)"}
          items={availableSpreads}
          selected={selectedSpread}
          onSelect={setSelectedSpread}
          maxVisibleItems={3}
        />
      )} */}
    </>
  );
};

interface UpgradeGuideProps {
  currentPlan: Plan;
  upgradablePlans: Plan[];
  getPlanColors: (planCode: string) => {
    primary: string;
    secondary: string;
    accent: string;
  };
  handleChangePlan: (targetPlan: UserPlan) => void;
  isChangingPlan: boolean;
}

const UpgradeGuide: React.FC<UpgradeGuideProps> = ({
  currentPlan,
  upgradablePlans,
  getPlanColors,
  handleChangePlan,
  isChangingPlan,
}) => {
  const isGuest = currentPlan!.code === "GUEST";

  // Accordionのitems配列を作成
  const accordionItems: AccordionItem[] = upgradablePlans.map((plan) => {
    const colors = getPlanColors(plan.code);
    const icon =
      plan.code === "PREMIUM" ? "👑" : plan.code === "STANDARD" ? "💎" : "🆓";

    return {
      id: plan.code,
      title: plan.name,
      subtitle: `¥${plan.price.toLocaleString()}/月 - ${plan.description}`,
      icon,
      colors,
      content: (
        <>
          {/* 機能リスト */}
          <div className="space-y-1">
            {plan.features?.map((feature, i) => (
              <div
                key={i}
                className="text-xs text-gray-700 flex items-start gap-1.5"
              >
                <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* アップグレードボタン */}
          <button
            onClick={() => handleChangePlan(plan.code as UserPlan)}
            disabled={isChangingPlan}
            className="w-full mt-2 py-2 text-white rounded text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: colors.accent }}
          >
            {isChangingPlan
              ? "処理中..."
              : isGuest && plan.code === "FREE"
              ? "無料でユーザー登録"
              : `${plan.name}を始める  (¥${plan.price.toLocaleString()}/月)`}
          </button>
        </>
      ),
    };
  });

  return (
    <div className="mt-6 space-y-3">
      {currentPlan.code !== "PREMIUM" && (
        <div className="text-center text-sm text-gray-600 mb-3">
          💡 もっと詳しく占うなら
          {upgradablePlans && upgradablePlans.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="text-xs text-center text-gray-500">
                💡{" "}
                {isGuest
                  ? "無料登録でもっと楽しむ。本格プランもご用意"
                  : "さらに上位プランへアップグレード"}
              </div>

              {/* Accordionコンポーネント使用 */}
              <Accordion items={accordionItems} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface CurrentPlanViewProps {
  currentPlan: Plan;
  payload: AppJWTPayload;
  usageStats: UsageStats;
  getPlanColors: (planCode: string) => {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const CurrentPlanView: React.FC<CurrentPlanViewProps> = ({
  currentPlan,
  payload,
  usageStats,
  getPlanColors,
}) => {
  const getPlanIcon = () => {
    switch (currentPlan!.code) {
      case "PREMIUM":
        return "👑";
      case "STANDARD":
        return "💎";
      case "FREE":
        return "🆓";
      case "GUEST":
      default:
        return "👤";
    }
  };

  const currentColors = getPlanColors(currentPlan!.code);
  const user = payload?.user || null;
  const isPremium = currentPlan!.code === "PREMIUM";
  const isStandard = currentPlan!.code === "STANDARD";
  const isFree = currentPlan!.code === "FREE" || currentPlan!.code === "GUEST";

  return (
    <>
      <div
        className="mb-4 p-3 rounded-lg border-2"
        style={{
          backgroundColor: currentColors.primary,
          borderColor: currentColors.secondary,
        }}
      >
        <div className="text-center">
          <div className="font-bold" style={{ color: currentColors.accent }}>
            {getPlanIcon()} {currentPlan?.name}
          </div>
          <div className="text-sm text-gray-600">
            {user ? `認証済み: ${user.email}` : "未登録・ゲストモード"}
          </div>
        </div>
      </div>

      {isFree && (
        <div className="daily-limit mb-4">
          残り {usageStats.remainingReadings} 回
        </div>
      )}

      {isStandard && (
        <div className="mb-4 text-sm text-center text-gray-600">
          通常: {usageStats.remainingReadings}回 または ケルト十字:{" "}
          {usageStats.remainingCeltics}回
        </div>
      )}

      {isPremium && (
        <div className="mb-4 text-sm text-center text-gray-600">
          通常(ケルト十字を含む): {usageStats.remainingReadings}回 / パーソナル:{" "}
          {usageStats.remainingPersonal}回
        </div>
      )}
    </>
  );
};
