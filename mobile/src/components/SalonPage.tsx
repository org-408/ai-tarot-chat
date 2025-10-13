import { ChevronDown } from "lucide-react";
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
import type { UserPlan } from "../types";
import ScrollableRadioSelector from "./ScrollableRadioSelector";

interface SalonPageProps {
  payload: AppJWTPayload;
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
  masterData,
  usageStats,
  onChangePlan,
  onStartReading,
  isChangingPlan,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<ReadingCategory | null>(null);
  const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null);
  const [selectedTarotist, setSelectedTarotist] = useState<Tarotist | null>();
  const [userInput, setUserInput] = useState<string>("");
  const [aiMode, setAiMode] = useState<string>("ai-auto");
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const user = payload?.user || null;

  const currentPlan = useMemo(
    () =>
      masterData.plans.find(
        (p: Plan) => p.code === (payload?.planCode || "GUEST")
      ),
    [masterData.plans, payload?.planCode]
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

    return masterData.categories
      .filter((category: ReadingCategory) => {
        // GUESTとFREEは、恋愛・健康・金運を除外
        if (
          (currentPlan!.code === "GUEST" || currentPlan!.code === "FREE") &&
          ["恋愛", "仕事", "今日の運勢"].includes(category.name)
        ) {
          return true;
        }
        return false;
      })
      .map((category: ReadingCategory) => ({
        ...category,
        bio: category.description,
      }));
  }, [masterData, currentPlan]);

  // 3 スプレッドの取得とフィルタリング
  const availableSpreads = useMemo(() => {
    if (!masterData.spreads || !currentPlan || !masterData.categories)
      return [];

    return masterData.spreads
      .filter((spread: Spread) => {
        console.log("[SalonPage] スプレッドフィルタリング", {
          spreads: masterData.spreads,
          selectedCategory,
        });
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
      setSelectedTarotist(availableTarotists[0]);
    }
  }, [availableTarotists, selectedTarotist]);

  useEffect(() => {
    console.log("[SalonPage] availableCategories changed", availableCategories);
    if (availableCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(availableCategories[0]);
    }
  }, [availableCategories, selectedCategory]);

  useEffect(() => {
    console.log("[SalonPage] availableSpreads changed", availableSpreads);
    if (availableSpreads.length > 0 && !selectedSpread) {
      setSelectedSpread(availableSpreads[0]);
    }
  }, [availableSpreads, selectedSpread]);

  const handleStartReading = () => {
    if (!selectedTarotist || !selectedSpread || !selectedCategory) return;
    onStartReading(selectedTarotist!, selectedSpread, selectedCategory);
  };

  const handleChangePlan = (targetPlan: UserPlan) => {
    onChangePlan(targetPlan);
  };

  const isPremium = currentPlan!.code === "PREMIUM";
  const isStandard = currentPlan!.code === "STANDARD";
  const isFree = currentPlan!.code === "FREE" || currentPlan!.code === "GUEST";
  const isGuest = currentPlan!.code === "GUEST";

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

  return (
    <div className="main-container">
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
          通常: {usageStats.remainingReadings}回 / ケルト十字:{" "}
          {usageStats.remainingCeltics}回
        </div>
      )}

      {isPremium && (
        <div className="mb-4 text-sm text-center text-gray-600">
          通常: {usageStats.remainingReadings}回 / ケルト十字:{" "}
          {usageStats.remainingCeltics}回 / パーソナル:{" "}
          {usageStats.remainingPersonal}回
        </div>
      )}

      {isPremium && currentPlan?.hasPersonal && (
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
      )}

      {isPremium && currentPlan?.hasPersonal && (
        <div className="mb-6">
          <div className="section-title">🎴 占い方を選んでください:</div>
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
              <div>🎯 スプレッド選択</div>
            </div>
          </div>
        </div>
      )}

      {/* 占い師選択 */}
      {availableTarotists.length > 0 && (
        <ScrollableRadioSelector
          title="🔮 占い師を選択:"
          items={availableTarotists}
          selected={selectedTarotist || null}
          onSelect={setSelectedTarotist}
          maxVisibleItems={3}
        />
      )}

      {/* カテゴリー選択 */}
      {(!isPremium || aiMode !== "ai-auto") && (
        <ScrollableRadioSelector
          title={`🎯 ${
            isPremium || isStandard
              ? "占いたいジャンルを選択:"
              : "どのジャンルを占いますか?"
          }`}
          items={availableCategories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          maxVisibleItems={3}
        />
      )}

      {/* スプレッド選択 */}
      <ScrollableRadioSelector
        title={isPremium ? "🎴 スプレッドを選択:" : "🎴 占い方:"}
        items={availableSpreads}
        selected={selectedSpread}
        onSelect={setSelectedSpread}
        maxVisibleItems={3}
      />

      <div className="mt-6 space-y-3">
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

              {/* 上位プランをアコーディオン表示 */}
              {upgradablePlans.map(
                (plan: {
                  code: string;
                  id: string;
                  name: string;
                  price: number;
                  description: string;
                  features: string[];
                  maxReadings: number;
                  maxCeltics: number;
                  hasPersonal: boolean;
                  maxPersonal: number;
                }) => {
                  const colors = getPlanColors(plan.code);
                  const isExpanded = expandedPlan === plan.code;

                  return (
                    <div
                      key={plan.id}
                      className="border-2 rounded-lg overflow-hidden transition-all"
                      style={{ borderColor: colors.secondary }}
                    >
                      {/* アコーディオンヘッダー */}
                      <button
                        onClick={() =>
                          setExpandedPlan(isExpanded ? null : plan.code)
                        }
                        className="w-full p-3 flex items-center justify-between transition-colors"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <div className="text-left flex-1">
                          <div
                            className="font-bold flex items-center gap-1"
                            style={{ color: colors.accent }}
                          >
                            <span>
                              {plan.code === "PREMIUM"
                                ? "👑"
                                : plan.code === "STANDARD"
                                ? "💎"
                                : "🆓"}
                            </span>
                            <span>{plan.name}</span>
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            ¥{plan.price.toLocaleString()}/月 -{" "}
                            {plan.description}
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform flex-shrink-0 ml-2 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          style={{ color: colors.accent }}
                        />
                      </button>

                      {/* アコーディオンコンテンツ */}
                      {isExpanded && (
                        <div
                          className="p-3 bg-white border-t-2 space-y-2"
                          style={{ borderColor: colors.secondary }}
                        >
                          {/* 機能リスト */}
                          <div className="space-y-1">
                            {plan.features?.map((feature, i) => (
                              <div
                                key={i}
                                className="text-xs text-gray-700 flex items-start gap-1.5"
                              >
                                <span className="text-green-500 flex-shrink-0 mt-0.5">
                                  ✓
                                </span>
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>

                          {/* アップグレードボタン */}
                          <button
                            onClick={() => {
                              handleChangePlan(plan.code as UserPlan);
                            }}
                            disabled={isChangingPlan}
                            className="w-full mt-2 py-2 text-white rounded text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: colors.accent }}
                          >
                            {isChangingPlan
                              ? "処理中..."
                              : isGuest && plan.code === "FREE"
                              ? `無料でユーザー登録`
                              : `${
                                  plan.name
                                }を始める  (¥${plan.price.toLocaleString()}/月)`}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>

      <div className="fixed-action-button">
        <button
          className="w-full py-4 bg-gradient-to-r
          from-purple-500 to-pink-500 text-white rounded-xl
            font-bold text-lg shadow-2xl hover:from-purple-600
          hover:to-pink-600 active:scale-95 transition-all disabled:opacity-80 disabled:cursor-not-allowed"
          onClick={handleStartReading}
          disabled={
            (isFree && usageStats.remainingReadings <= 0) ||
            !selectedSpread ||
            !selectedCategory
          }
        >
          {isPremium ? "🤖 占いを始める" : "✨ 占いを始める ✨"}
        </button>

        {isFree && (
          <div className="text-center text-xs text-black bg-purple-200 bg-opacity-50 rounded-lg px-2 py-1 mt-2 backdrop-blur-sm">
            今日はあと{usageStats.remainingReadings}回
          </div>
        )}
      </div>
    </div>
  );
};

export default SalonPage;
