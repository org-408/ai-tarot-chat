import { useEffect, useMemo, useState } from "react";
import type { Plan, Spread } from "../../../shared/lib/types";
import type { UserPlan } from "../types";
import { useAuth } from "../lib/hooks/useAuth";
import { useMaster } from "../lib/hooks/useMaster";
import { useUsage } from "../lib/hooks/useUsage";
import { ChevronDown } from "lucide-react";

interface SalonPageProps {
  onLogin: () => void;
  onUpgrade: (plan: UserPlan) => void;
  onDowngrade: (plan: UserPlan) => void;
  onStartReading: (spreadId: string, categoryId: string) => void;
  isLoggingIn: boolean;
}

const SalonPage: React.FC<SalonPageProps> = ({
  onLogin,
  onUpgrade,
  onDowngrade,
  onStartReading,
  isLoggingIn,
}) => {
  const { payload, plan: currentPlan, isAuthenticated, clientId } = useAuth();
  const { data: masterData, isLoading: masterLoading } = useMaster();
  const { data: usageStats, isLoading: usageLoading } = useUsage(clientId!);

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSpread, setSelectedSpread] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");
  const [aiMode, setAiMode] = useState<string>("ai-auto");
  
  const user = payload?.user || null;

  console.log('[SalonPage] Loading state:', {
    masterLoading,
    usageLoading,
    hasMasterData: !!masterData,
    hasUsageStats: !!usageStats,
    clientId,
    currentPlan,
  });

  if (masterLoading || usageLoading || !masterData || !usageStats) {
    const reasons = [];
    if (masterLoading) reasons.push('マスターデータ読み込み中');
    if (usageLoading) reasons.push('利用状況読み込み中');
    if (!masterData) reasons.push('マスターデータなし');
    if (!usageStats) reasons.push('利用状況データなし');
    
    return (
      <div className="main-container">
        <div className="text-center py-20">
          <div>読み込み中...</div>
          <div className="text-xs text-gray-500 mt-2">
            {reasons.join(' / ')}
          </div>
        </div>
      </div>
    );
  }

  const currentPlanData = masterData.plans?.find(
    (p: any) => p.code === currentPlan
  );

  const availableCategories = masterData.categories || [];
  const categoriesToShow =
    currentPlan === "GUEST" || currentPlan === "FREE"
      ? availableCategories.slice(0, 3)
      : availableCategories;

  const checkNo =
    currentPlanData!.code === "GUEST" ? 2 : currentPlanData!.no + 1;
  const availablePlansFromPlanNo = masterData.plans.filter(
    (p: Plan) => p.no <= (checkNo || 0)
  );
  
  const getAvailableSpreads = () => {
    if (!masterData.spreads) return [];

    return masterData.spreads.filter((spread: Spread) => {
      if (
        !availablePlansFromPlanNo.map((p) => p.code).includes(spread.plan!.code)
      ) {
        return false;
      }

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

  // コンポーネント内
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const freePlan = masterData.plans?.find(p => p.code === "FREE");
  const standardPlan = masterData.plans?.find(p => p.code === "STANDARD");
  const premiumPlan = masterData.plans?.find(p => p.code === "PREMIUM");

  // 上位プラン取得
  const upgradablePlans = masterData.plans
    ?.filter(p => p.no > (currentPlanData?.no || 0))
    .sort((a, b) => a.no - b.no);

  // プランごとの色設定を動的に決定
  const getPlanColors = (planCode: string) => {
    switch(planCode) {
      case 'PREMIUM':
        return {
          border: 'border-yellow-300',
          bg: 'bg-yellow-50',
          text: 'text-yellow-800',
          subText: 'text-yellow-600',
          button: 'bg-yellow-500 hover:bg-yellow-600',
          icon: '👑'
        };
      case 'STANDARD':
        return {
          border: 'border-blue-200',
          bg: 'bg-blue-50',
          text: 'text-blue-800',
          subText: 'text-blue-600',
          button: 'bg-blue-500 hover:bg-blue-600',
          icon: '💎'
        };
      default: // FREE
        return {
          border: 'border-gray-200',
          bg: 'bg-gray-50',
          text: 'text-gray-800',
          subText: 'text-gray-600',
          button: 'bg-gray-500 hover:bg-gray-600',
          icon: '🆓'
        };
    }
  };

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

  const handleUpgradeClick = (targetPlan: UserPlan) => {
    if (!isAuthenticated) {
      console.log(`[SalonPage] 未認証：${targetPlan}へのアップグレードを保留してサインイン`);
      sessionStorage.setItem('pendingUpgrade', targetPlan);
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

      {isGuest && (
        <div className="mt-6 space-y-3">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-center">
              <div className="font-bold text-blue-800 mb-2">
                📝 無料登録で回数3倍
              </div>
              <div className="text-sm text-blue-600 mb-3">
                ✓ 1日3回まで占える<br/>
                ✓ 履歴保存で振り返り可能
              </div>
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isLoggingIn ? "認証中..." : "無料でユーザー登録"}
              </button>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600 mb-2">
            💡 または、一気に本格プランへ
          </div>
          
          <button
            onClick={() => handleUpgradeClick("STANDARD")}
            disabled={isLoggingIn}
            className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md disabled:opacity-50"
          >
            💎 スタンダード（¥{masterData.plans?.find((p) => p.code === "STANDARD")?.price || 480}/月）
            <div className="text-xs opacity-90">広告なし・無制限</div>
          </button>
          
          <button
            onClick={() => handleUpgradeClick("PREMIUM")}
            disabled={isLoggingIn}
            className="w-full py-3 px-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-colors shadow-md disabled:opacity-50"
          >
            👑 プレミアム（¥{masterData.plans?.find((p) => p.code === "PREMIUM")?.price || 980}/月）
            <div className="text-xs opacity-90">AI対話＋全機能</div>
          </button>

          <div className="text-xs text-center text-gray-500 mt-2">
            ※有料プランは自動的にユーザー登録されます
          </div>
        </div>
      )}

      {currentPlan === "FREE" && (
        <div className="mt-6 space-y-3">
          <div className="text-center text-sm text-gray-600 mb-3">
            💡 もっと詳しく占うなら
              {upgradablePlans && upgradablePlans.length > 0 && (
                <div className="mt-6 space-y-3">
                  {/* ゲストの場合のみ無料登録CTA */}
                  {isGuest && freePlan && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm font-bold text-blue-800 mb-1">
                        🔓 無料登録で回数{freePlan.maxReadings}倍
                      </div>
                      <div className="text-xs text-blue-600 mb-2">
                        1日{freePlan.maxReadings}回まで + {freePlan.hasHistory ? '履歴保存' : ''}
                      </div>
                      <button
                        onClick={onLogin}
                        disabled={isLoggingIn}
                        className="w-full py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors disabled:opacity-50"
                      >
                        {isLoggingIn ? "認証中..." : "無料でユーザー登録"}
                      </button>
                    </div>
                  )}

                  <div className="text-xs text-center text-gray-500">
                    💡 {isGuest ? 'または、本格プランで全機能を' : 'さらに上位プランへアップグレード'}
                  </div>

                  {/* 上位プランをアコーディオン表示 */}
                  {upgradablePlans.map(plan => {
                    const colors = getPlanColors(plan.code);
                    const isExpanded = expandedPlan === plan.code;
                    
                    return (
                      <div 
                        key={plan.id}
                        className={`border ${colors.border} rounded-lg overflow-hidden transition-all`}
                      >
                        {/* アコーディオンヘッダー */}
                        <button
                          onClick={() => setExpandedPlan(isExpanded ? null : plan.code)}
                          className={`w-full p-3 ${colors.bg} flex items-center justify-between transition-colors`}
                        >
                          <div className="text-left flex-1">
                            <div className={`font-bold ${colors.text} flex items-center gap-1`}>
                              <span>{colors.icon}</span>
                              <span>{plan.name}</span>
                            </div>
                            <div className={`text-xs ${colors.subText} mt-0.5`}>
                              ¥{plan.price.toLocaleString()}/月 - {plan.description}
                            </div>
                          </div>
                          <ChevronDown 
                            className={`w-4 h-4 ${colors.text} transition-transform flex-shrink-0 ml-2 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        
                        {/* アコーディオンコンテンツ */}
                        {isExpanded && (
                          <div className={`p-3 bg-white border-t ${colors.border} space-y-2`}>
                            {/* 機能リスト */}
                            <div className="space-y-1">
                              {plan.features?.map((feature, i) => (
                                <div key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                                  <span>{feature}</span>
                                </div>
                              ))}
                            </div>

                            {/* 利用制限情報 */}
                            <div className="pt-2 border-t border-gray-100">
                              <div className="text-[10px] text-gray-500 space-y-0.5">
                                {plan.maxReadings > 0 && (
                                  <div>📊 通常占い: {plan.maxReadings === 999 ? '無制限' : `${plan.maxReadings}回/日`}</div>
                                )}
                                {plan.maxCeltics > 0 && (
                                  <div>⭐ ケルト十字: {plan.maxCeltics === 999 ? '無制限' : `${plan.maxCeltics}回/日`}</div>
                                )}
                                {plan.hasPersonal && plan.maxPersonal > 0 && (
                                  <div>🤖 パーソナル占い: {plan.maxPersonal === 999 ? '無制限' : `${plan.maxPersonal}回/日`}</div>
                                )}
                              </div>
                            </div>

                            {/* アップグレードボタン */}
                            <button
                              onClick={() => handleUpgradeClick(plan.code as UserPlan)}
                              disabled={isLoggingIn}
                              className={`w-full mt-2 py-2 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 ${colors.button}`}
                            >
                              {isLoggingIn ? "処理中..." : `${plan.name}を始める`}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
          
          <button
            onClick={() => handleUpgradeClick("STANDARD")}
            className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md"
          >
            💎 スタンダード（¥{masterData.plans?.find((p) => p.code === "STANDARD")?.price || 480}/月）
            <div className="text-xs opacity-90">広告なし・無制限</div>
          </button>
          
          <button
            onClick={() => handleUpgradeClick("PREMIUM")}
            className="w-full py-3 px-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-colors shadow-md"
          >
            👑 プレミアム（¥{masterData.plans?.find((p) => p.code === "PREMIUM")?.price || 980}/月）
            <div className="text-xs opacity-90">AI対話＋全機能</div>
          </button>
        </div>
      )}

      {(isStandard || isPremium) && (
        <div className="mt-6 space-y-2">
          {isStandard && (
            <button
              onClick={() => onUpgrade("PREMIUM")}
              className="w-full py-2 px-4 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 transition-colors"
            >
              👑 プレミアムプラン (¥
              {masterData.plans?.find((p) => p.code === "PREMIUM")?.price || 980}
              /月)
            </button>
          )}
          
          <button
            onClick={() => {
              const targetPlan = isPremium ? "STANDARD" : "FREE";
              if (confirm(`本当に ${targetPlan === "STANDARD" ? "スタンダード" : "フリー"} プランにダウングレードしますか？`)) {
                onDowngrade(targetPlan as UserPlan);
              }
            }}
            className="w-full py-2 px-4 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
          >
            {isPremium ? "💎 スタンダードプランにダウングレード" : "フリープランにダウングレード"}
          </button>
        </div>
      )}

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
            今日あと{usageStats.remainingReadings}回
          </div>
        )}
      </div>
    </div>
  );
};

export default SalonPage;