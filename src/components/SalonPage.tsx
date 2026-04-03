import { useEffect, useState } from "react";
import {
  AppJWTPayload,
  Plan,
  Spread,
  UsageStats,
} from "../../shared/lib/types";
import { MasterData, UserPlan } from "../types";

interface SalonPageProps {
  payload: AppJWTPayload | null;
  masterData: MasterData;
  isAuthenticated: boolean;
  onLogin: () => void;
  onUpgrade: (plan: UserPlan) => void;
  onDowngrade: (plan: UserPlan) => void;
  isLoggingIn: boolean;
  usageStats: UsageStats;
  onStartReading: (spreadId: string, categoryId: string) => void;
}

const SalonPage: React.FC<SalonPageProps> = ({
  payload,
  masterData,
  isAuthenticated,
  onLogin,
  onUpgrade,
  onDowngrade,
  isLoggingIn,
  usageStats,
  onStartReading,
}) => {
  const currentPlan = (payload?.planCode || "GUEST") as UserPlan;
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSpread, setSelectedSpread] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");
  const [aiMode, setAiMode] = useState<string>("ai-auto");
  const user = payload?.user || null;

  // 現在のプラン情報を取得
  const currentPlanData = masterData.plans?.find(
    (p: any) => p.code === currentPlan
  );

  // 利用可能なカテゴリ（全て表示）
  const availableCategories = masterData.categories || [];

  const categoriesToShow =
    currentPlan === "GUEST" || currentPlan === "FREE"
      ? availableCategories.slice(0, 3)
      : availableCategories;
  console.log("Categories to Show:", categoriesToShow);

  // 利用可能なスプレッドをフィルタリング
  console.log("Current Plan Data:", currentPlanData);
  console.log("Master Data Spreads:", masterData.spreads);
  const checkNo =
    currentPlanData!.code === "GUEST" ? 2 : currentPlanData!.no + 1;
  const availablePlansFromPlanNo = masterData.plans.filter(
    (p: Plan) => p.no <= (checkNo || 0)
  );
  console.log("Current Plan No:", checkNo);
  console.log("Available Plans from Plan No:", availablePlansFromPlanNo);
  const getAvailableSpreads = () => {
    if (!masterData.spreads) return [];

    return masterData.spreads.filter((spread: Spread) => {
      // プラン制限チェック
      if (
        !availablePlansFromPlanNo.map((p) => p.code).includes(spread.plan!.code)
      ) {
        return false;
      }

      // カテゴリフィルタ
      if (selectedCategory) {
        const spreadCategoryIds =
          spread.categories?.map((sc: any) => sc.categoryId) || [];
        if (!spreadCategoryIds.includes(selectedCategory)) {
          return false;
        }
      }

      return true;
    });
  };

  const availableSpreads = getAvailableSpreads();
  console.log("Available Spreads:", availableSpreads);

  // 初期選択
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

  const handleStartReading = () => {
    if (!selectedSpread || !selectedCategory) return;
    onStartReading(selectedSpread, selectedCategory);
  };

  // プラン判定
  const isPremium = currentPlan === "PREMIUM";
  const isStandard = currentPlan === "STANDARD";
  const isFree = currentPlan === "FREE" || currentPlan === "GUEST";

  // プランアイコン取得
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

  return (
    <div className="main-container">
      {/* プラン表示ヘッダー */}
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

      {/* 回数制限表示 */}
      {isFree && (
        <div className="daily-limit mb-4">
          残り {usageStats.remainingReadings} 回
        </div>
      )}

      {isStandard && (
        <div className="mb-4 text-sm text-center text-gray-600">
          通常: {usageStats.remainingReadings}回
        </div>
      )}

      {isPremium && (
        <div className="mb-4 text-sm text-center text-gray-600">
          通常(ケルト十字を含む): {usageStats.remainingReadings}回 / パーソナル:{" "}
          {usageStats.remainingPersonal}回
        </div>
      )}

      {/* プレミアム: AI入力フィールド */}
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

      {/* プレミアム: AIおまかせオプション */}
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

      {/* カテゴリ選択 */}
      {(!isPremium || aiMode !== "ai-auto") && (
        <div className="mb-6">
          <div className="section-title">
            🎯{" "}
            {isPremium || isStandard
              ? "占いたいジャンルを選択："
              : "どのジャンルを占いますか？"}
          </div>
          <div className="space-y-2">
            {categoriesToShow.map((category: any) => (
              <div
                key={category.id}
                className={`option-item ${
                  selectedCategory === category.id ? "selected" : ""
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <div
                  className={`radio-button ${
                    selectedCategory === category.id ? "selected" : ""
                  }`}
                ></div>
                <div>
                  <div>{category.name}</div>
                  <div className="text-xs text-gray-500">
                    {category.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* スプレッド選択 */}
      <div className="mb-6">
        <div className="section-title">
          {isPremium ? "🎴 スプレッドを選択：" : "🎴 占い方："}
        </div>
        <div className="space-y-2">
          {availableSpreads.map((spread: any) => {
            const cardCount = spread.cells?.length || 0;
            return (
              <div
                key={spread.id}
                className={`option-item ${
                  selectedSpread === spread.id ? "selected" : ""
                }`}
                onClick={() => setSelectedSpread(spread.id)}
              >
                <div
                  className={`radio-button ${
                    selectedSpread === spread.id ? "selected" : ""
                  }`}
                ></div>
                <div>
                  <div>{spread.name}</div>
                  <div className="text-xs text-gray-500">
                    {spread.category} ({cardCount}枚)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 占い開始ボタン */}
      <button
        className="primary-button"
        onClick={handleStartReading}
        disabled={
          (isFree && usageStats.remainingReadings <= 0) ||
          !selectedSpread ||
          !selectedCategory
        }
      >
        {isPremium ? "🤖 占いを始める" : "🔮 占いを始める"}
      </button>

      {/* アップグレードヒント */}
      {!isPremium && (
        <div className="upgrade-hint">
          {isFree
            ? "💎 もっと詳しく占うには→アップグレード"
            : "🤖 AIと対話しながら占うには→プレミアム"}
        </div>
      )}

      {/* ログインセクション（未認証フリープランのみ） */}
      {isFree && !isAuthenticated && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <div className="font-bold text-blue-800 mb-2">
              🔑 アカウント作成
            </div>
            <div className="text-sm text-blue-600 mb-3">
              ログインで履歴保存・有料プランへのアップグレードが可能
            </div>
            <button
              onClick={onLogin}
              disabled={isLoggingIn}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isLoggingIn ? "認証中..." : "ユーザー登録してもっと楽しむ"}
            </button>
          </div>
        </div>
      )}

      {/* プラン変更ボタン */}
      <div className="mt-6 space-y-2">
        {isFree && (
          <>
            <button
              onClick={() => onUpgrade("STANDARD")}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              💎 スタンダードプラン (¥
              {masterData.plans?.find((p) => p.code === "STANDARD")?.price ||
                480}
              /月)
            </button>
            <button
              onClick={() => onUpgrade("PREMIUM")}
              className="w-full py-2 px-4 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 transition-colors"
            >
              👑 プレミアムプラン (¥
              {masterData.plans?.find((p) => p.code === "PREMIUM")?.price ||
                980}
              /月)
            </button>
          </>
        )}

        {isStandard && (
          <>
            <button
              onClick={() => onUpgrade("PREMIUM")}
              className="w-full py-2 px-4 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 transition-colors"
            >
              👑 プレミアムプラン (¥
              {masterData.plans?.find((p) => p.code === "PREMIUM")?.price ||
                980}
              /月)
            </button>
            <button
              onClick={() => onDowngrade("FREE")}
              className="w-full py-2 px-4 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
            >
              フリープランにダウングレード
            </button>
          </>
        )}

        {isPremium && (
          <>
            <button
              onClick={() => onDowngrade("STANDARD")}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              💎 スタンダードプラン (¥
              {masterData.plans?.find((p) => p.code === "STANDARD")?.price ||
                480}
              /月)
            </button>
            <button
              onClick={() => onDowngrade("FREE")}
              className="w-full py-2 px-4 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
            >
              フリープランにダウングレード
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SalonPage;
