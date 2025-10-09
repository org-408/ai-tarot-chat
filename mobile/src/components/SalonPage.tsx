import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  JWTPayload,
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
  payload: JWTPayload;
  isAuthenticated: boolean;
  masterData: MasterData;
  usageStats: UsageStats;
  onLogin: () => void;
  onUpgrade: (plan: UserPlan) => void;
  onDowngrade: (plan: UserPlan) => void;
  onStartReading: (spreadId: string, categoryId: string) => void;
  isLoggingIn: boolean;
}

const SalonPage: React.FC<SalonPageProps> = ({
  payload,
  isAuthenticated,
  masterData,
  usageStats,
  onLogin,
  onUpgrade,
  onStartReading,
  isLoggingIn,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSpread, setSelectedSpread] = useState<string>("");
  const [selectedTarotist, setSelectedTarotist] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");
  const [aiMode, setAiMode] = useState<string>("ai-auto");
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const user = payload?.user || null;
  const currentPlan = payload?.planCode || "GUEST";

  const currentPlanData = masterData!.plans?.find(
    (p: Plan) => p.code === currentPlan
  );

  const availableCategories = masterData.categories;
  const categoriesToShow =
    currentPlan === "GUEST" || currentPlan === "FREE"
      ? availableCategories.slice(0, 3)
      : availableCategories;

  const checkNo =
    currentPlanData!.code === "GUEST" ? 2 : currentPlanData!.no + 1;
  const availablePlansFromPlanNo = masterData!.plans.filter(
    (p: Plan) => p.no <= (checkNo || 0)
  );

  // 占い師の取得とフィルタリング
  const availableTarotists = useMemo(() => {
    if (!masterData.tarotists) return [];

    return masterData.tarotists.filter((tarotist: Tarotist) => {
      // 現在のプラン番号以下の占い師のみ表示
      const tarotistPlan = masterData.plans?.find(
        (p: Plan) => p.code === tarotist.plan!.code
      );
      return tarotistPlan && tarotistPlan.no <= (currentPlanData?.no || 0);
    });
  }, [masterData, currentPlanData]);

  const getAvailableSpreads = () => {
    if (!masterData!.spreads) return [];

    return masterData!.spreads.filter((spread: Spread) => {
      if (
        !availablePlansFromPlanNo
          .map((p: Plan) => p.code)
          .includes(spread.plan!.code)
      ) {
        return false;
      }

      if (selectedCategory) {
        const spreadCategoryIds =
          spread.categories?.map((sc: SpreadToCategory) => sc.categoryId) || [];
        if (!spreadCategoryIds.includes(selectedCategory)) {
          return false;
        }
      }

      return true;
    });
  };

  const availableSpreads = getAvailableSpreads();

  const upgradablePlans = masterData!.plans
    ?.filter((p: Plan) => p.no > (currentPlanData?.no || 0))
    .sort((a: { no: number }, b: { no: number }) => a.no - b.no);

  const getPlanColors = (planCode: string) => {
    switch (planCode) {
      case "PREMIUM":
        return {
          border: "border-yellow-300",
          bg: "bg-yellow-50",
          text: "text-yellow-800",
          subText: "text-yellow-600",
          button: "bg-yellow-500 hover:bg-yellow-600",
          icon: "👑",
        };
      case "STANDARD":
        return {
          border: "border-blue-200",
          bg: "bg-blue-50",
          text: "text-blue-800",
          subText: "text-blue-600",
          button: "bg-blue-500 hover:bg-blue-600",
          icon: "💎",
        };
      default:
        return {
          border: "border-gray-200",
          bg: "bg-gray-50",
          text: "text-gray-800",
          subText: "text-gray-600",
          button: "bg-gray-500 hover:bg-gray-600",
          icon: "🆓",
        };
    }
  };

  useMemo(() => {
    console.log("[SalonPage] masterData or usageStats changed", {
      masterData,
      usageStats,
    });
  }, [masterData, usageStats]);

  useEffect(() => {
    if (availableCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(availableCategories[0].id);
    }
  }, [availableCategories, selectedCategory]);

  useEffect(() => {
    if (availableSpreads.length > 0 && !selectedSpread) {
      setSelectedSpread(availableSpreads[0].id);
    }
  }, [availableSpreads, selectedSpread]);

  useEffect(() => {
    if (availableTarotists.length > 0 && !selectedTarotist) {
      setSelectedTarotist(availableTarotists[0].id);
    }
  }, [availableTarotists, selectedTarotist]);

  const handleStartReading = () => {
    if (!selectedSpread || !selectedCategory) return;
    onStartReading(selectedSpread, selectedCategory);
  };

  const handleUpgradeClick = (targetPlan: UserPlan) => {
    if (!isAuthenticated) {
      console.log(
        `[SalonPage] 未認証：${targetPlan}へのアップグレードを保留してサインイン`
      );
      sessionStorage.setItem("pendingUpgrade", targetPlan);
      onLogin();
    } else {
      console.log(`[SalonPage] 認証済み：${targetPlan}へ直接アップグレード`);
      onUpgrade(targetPlan);
    }
  };

  const isPremium = currentPlan === "PREMIUM";
  const isStandard = currentPlan === "STANDARD";
  const isFree = currentPlan === "FREE" || currentPlan === "GUEST";
  const isGuest = currentPlan === "GUEST";

  const getPlanIcon = () => {
    switch (currentPlan) {
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

  // ScrollableRadioSelector用のデータ変換
  const categoryItems = categoriesToShow.map((category: ReadingCategory) => ({
    id: category.id,
    label: category.name,
    description: category.description,
  }));

  const spreadItems = availableSpreads.map((spread: Spread) => ({
    id: spread.id,
    label: spread.name,
    description: `${spread.category} (${spread.cells?.length || 0}枚)`,
  }));

  const tarotistItems = availableTarotists.map((tarotist: Tarotist) => ({
    id: tarotist.id,
    label: tarotist.name,
    description: tarotist.bio || tarotist.trait,
    icon: tarotist.icon || "🔮",
  }));

  return (
    <div className="main-container">
      <div
        className={`mb-4 p-3 rounded-lg border ${
          isPremium
            ? "bg-yellow-50 border-yellow-200"
            : isStandard
            ? "bg-blue-50 border-blue-200"
            : "bg-gray-50 border-gray-200"
        }`}
      >
        <div className="text-center">
          <div
            className={`font-bold ${
              isPremium
                ? "text-yellow-800"
                : isStandard
                ? "text-blue-800"
                : "text-gray-700"
            }`}
          >
            {getPlanIcon()} {currentPlanData?.name}
          </div>
          <div
            className={`text-sm ${
              isPremium
                ? "text-yellow-600"
                : isStandard
                ? "text-blue-600"
                : "text-gray-600"
            }`}
          >
            {isAuthenticated && user
              ? `認証済み: ${user.email}`
              : "未登録・ゲストモード"}
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

      {isPremium && currentPlanData?.hasPersonal && (
        <div className="mb-6">
          <div className="section-title">📝 どんなことを占いたいですか？</div>
          <input
            type="text"
            className="text-input"
            placeholder="例：彼との関係がうまくいくか知りたい"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
        </div>
      )}

      {isPremium && currentPlanData?.hasPersonal && (
        <div className="mb-6">
          <div className="section-title">🎴 占い方を選んでください：</div>
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
          title="🔮 占い師を選択："
          items={tarotistItems}
          selectedId={selectedTarotist}
          onSelect={setSelectedTarotist}
          maxVisibleItems={3}
        />
      )}

      {/* カテゴリー選択 */}
      {(!isPremium || aiMode !== "ai-auto") && (
        <ScrollableRadioSelector
          title={`🎯 ${
            isPremium || isStandard
              ? "占いたいジャンルを選択："
              : "どのジャンルを占いますか？"
          }`}
          items={categoryItems}
          selectedId={selectedCategory}
          onSelect={setSelectedCategory}
          maxVisibleItems={3}
        />
      )}

      {/* スプレッド選択 */}
      <ScrollableRadioSelector
        title={isPremium ? "🎴 スプレッドを選択：" : "🎴 占い方："}
        items={spreadItems}
        selectedId={selectedSpread}
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
                      className={`border ${colors.border} rounded-lg overflow-hidden transition-all`}
                    >
                      {/* アコーディオンヘッダー */}
                      <button
                        onClick={() =>
                          setExpandedPlan(isExpanded ? null : plan.code)
                        }
                        className={`w-full p-3 ${colors.bg} flex items-center justify-between transition-colors`}
                      >
                        <div className="text-left flex-1">
                          <div
                            className={`font-bold ${colors.text} flex items-center gap-1`}
                          >
                            <span>{colors.icon}</span>
                            <span>{plan.name}</span>
                          </div>
                          <div className={`text-xs ${colors.subText} mt-0.5`}>
                            ¥{plan.price.toLocaleString()}/月 -{" "}
                            {plan.description}
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 ${
                            colors.text
                          } transition-transform flex-shrink-0 ml-2 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* アコーディオンコンテンツ */}
                      {isExpanded && (
                        <div
                          className={`p-3 bg-white border-t ${colors.border} space-y-2`}
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
                              if (isGuest) {
                                onLogin();
                              } else {
                                handleUpgradeClick(plan.code as UserPlan);
                              }
                            }}
                            disabled={isLoggingIn}
                            className={`w-full mt-2 py-2 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 ${colors.button}`}
                          >
                            {isLoggingIn
                              ? "処理中..."
                              : isGuest && expandedPlan === "FREE"
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
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg shadow-2xl hover:from-purple-600 hover:to-pink-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
