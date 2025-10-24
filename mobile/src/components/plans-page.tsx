import type {
  AppJWTPayload,
  MasterData,
  Plan,
  PlanInput,
} from "../../../shared/lib/types";
import type { UserPlan } from "../types";

interface PlansPageProps {
  payload: AppJWTPayload;
  currentPlan: Plan;
  masterData: MasterData;
  onChangePlan: (plan: UserPlan) => void;
  isChangingPlan: boolean;
}

const PlansPage: React.FC<PlansPageProps> = ({
  payload,
  currentPlan,
  masterData,
  onChangePlan,
  isChangingPlan,
}) => {
  const planCode = currentPlan.code || "GUEST";
  const planData = masterData.plans.reduce((acc, plan) => {
    acc[plan.code as UserPlan] = {
      no: plan.no,
      code: plan.code,
      name: plan.name,
      price: plan.price,
      requiresAuth: plan.requiresAuth,
      description: plan.description,
      features: plan.features,
      isActive: plan.isActive,
      maxReadings: plan.maxReadings,
      maxCeltics: plan.maxCeltics,
      maxPersonal: plan.maxPersonal,
      hasPersonal: plan.hasPersonal,
      hasHistory: plan.hasHistory,
      // データベースから色情報を取得
      primaryColor: plan.primaryColor,
      secondaryColor: plan.secondaryColor,
      accentColor: plan.accentColor,
      popular: plan.code === "STANDARD", // スタンダードを人気に設定
    };
    return acc;
  }, {} as Record<string, PlanInput & { popular: boolean; primaryColor?: string; secondaryColor?: string; accentColor?: string }>);

  const handlePlanChange = (planCode: UserPlan) => {
    onChangePlan(planCode);
  };

  return (
    <div className="main-container">
      {/* ヘッダー */}
      <div className="page-title pt-3">💎 プラン選択</div>

      {/* 認証状態表示 */}
      <div
        className="mb-6 p-4 rounded-lg text-center"
        style={{
          backgroundColor: planData[planCode].primaryColor,
          borderColor: planData[planCode].secondaryColor,
          borderWidth: "2px",
        }}
      >
        <div className="text-sm text-gray-600">現在の状態</div>
        <div className="font-bold text-lg">{planData[planCode].name}</div>
        <div className="text-sm text-gray-500">¥{planData[planCode].price}</div>
        {!payload.user && (
          <div className="text-xs text-orange-600 mt-1">
            ⚠️ 未認証(有料プラン選択時に自動ログイン)
          </div>
        )}
      </div>

      {/* プラン比較カード */}
      <div className="space-y-4">
        {(
          Object.entries(planData) as [
            keyof typeof planData,
            typeof planData.FREE
          ][]
        ).map(([planKey, plan]) => (
          <div
            key={planKey}
            className={`relative p-4 rounded-lg border-2 transition-all ${
              planCode === planKey
                ? `ring-2 ring-offset-2 ${
                    plan.accentColor
                      ? `ring-[${plan.accentColor}]`
                      : "ring-blue-500"
                  }`
                : "hover:shadow-md"
            }`}
            style={{
              backgroundColor:
                planCode === planKey ? plan.primaryColor : "white",
              borderColor:
                planCode === planKey ? plan.accentColor : plan.secondaryColor,
            }}
          >
            {/* 人気バッジ */}
            {plan.popular && (
              <div
                className="absolute -top-2 left-4 text-white text-xs px-2 py-1 rounded"
                style={{ backgroundColor: plan.accentColor }}
              >
                おすすめ
              </div>
            )}

            {/* 認証必須バッジ */}
            {plan.requiresAuth && (
              <div className="absolute -top-2 right-4 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                認証必要
              </div>
            )}

            {/* プランヘッダー */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-bold text-lg">{plan.name}</div>
                <div className="text-sm text-gray-600">{plan.description}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-xl">¥{plan.price}</div>
                {planCode === planKey && (
                  <div
                    className="text-xs font-bold"
                    style={{ color: plan.accentColor }}
                  >
                    利用中
                  </div>
                )}
              </div>
            </div>

            {/* 機能リスト */}
            <div className="mb-4">
              <div className="text-sm font-bold mb-2">主な機能</div>
              <ul className="space-y-1">
                {plan.features.map((feature, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-700 flex items-center"
                  >
                    <span className="text-green-500 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* アクションボタン */}
            <div className="flex gap-2">
              {planCode === planKey ? (
                <div
                  className="w-full py-2 px-4 text-gray-600 rounded-lg text-center text-sm font-bold border"
                  style={{
                    color: plan.accentColor,
                    backgroundColor: plan.primaryColor,
                    borderColor: plan.accentColor,
                  }}
                >
                  現在利用中
                </div>
              ) : (planKey === "GUEST" && planCode !== "GUEST") ||
                planData[planCode].no >= planData[planKey].no ? null : (
                <button
                  onClick={() => handlePlanChange(planKey as UserPlan)}
                  disabled={isChangingPlan}
                  className="w-full py-2 px-4 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    backgroundColor: plan.accentColor,
                  }}
                >
                  {isChangingPlan
                    ? "認証中..."
                    : planData[planCode].no < planData[planKey].no
                    ? "アップグレード"
                    : "ダウングレード"}
                </button>
              )}
            </div>

            {/* 認証必須の説明 */}
            {planCode === "GUEST" && (
              <div className="mt-2 text-xs text-orange-600 text-center">
                このプランを選択すると自動的にログイン画面に移動します
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 注意事項 */}
      <div className="mt-6 p-3 bg-yellow-50 rounded-lg">
        <div className="text-xs text-yellow-800">
          <div className="font-bold mb-1">📝 プラン変更について</div>
          <ul className="space-y-1">
            <li>• フリープランは課金なしで利用可能(サインインが必要です)</li>
            <li>• 有料プランはサインインが必要です</li>
            <li>• アップグレードは即座に反映されます</li>
          </ul>
        </div>
      </div>

      {/* 競合比較 */}
      <div className="mt-6 p-4 bg-purple-50 rounded-lg">
        <div className="text-center">
          <div className="font-bold text-sm mb-2">💰 他社との比較</div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>
              📊 LINE占い(¥2,550)より <strong>62%安い</strong>
            </div>
            <div>
              🎯 Rint(¥400/¥960)に <strong>AI対話付きで差別化</strong>
            </div>
            <div>
              ✨ 神秘のタロット(買い切り)より <strong>継続的体験</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlansPage;
