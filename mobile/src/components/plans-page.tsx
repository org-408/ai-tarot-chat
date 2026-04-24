import { useTranslation } from "react-i18next";
import type {
  AppJWTPayload,
  MasterData,
  Plan,
  PlanInput,
} from "../../../shared/lib/types";
import { useMaster } from "../lib/hooks/use-master";
import { getPlanDisplayName } from "../lib/utils/plan-display";
import type { UserPlan } from "../types";

interface PlansPageProps {
  payload: AppJWTPayload;
  currentPlan: Plan;
  masterData: MasterData;
  onChangePlan: (
    plan: UserPlan,
    options?: { onSuccess?: "history" | "personal" | "stay" | "portrait" },
  ) => void;
  isChangingPlan: boolean;
}

const PlansPage: React.FC<PlansPageProps> = ({
  payload,
  currentPlan,
  masterData: _masterData,
  onChangePlan,
  isChangingPlan,
}) => {
  const { t } = useTranslation();
  // 現在言語に解決済みの plans (name / description / features が EN 時は英語) を使用
  const { plans: resolvedPlans } = useMaster();
  const planCode = currentPlan.code || "GUEST";
  const planData = resolvedPlans.reduce((acc, plan) => {
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
      maxPersonal: plan.maxPersonal,
      hasPersonal: plan.hasPersonal,
      hasHistory: plan.hasHistory,
      primaryColor: plan.primaryColor,
      secondaryColor: plan.secondaryColor,
      accentColor: plan.accentColor,
      popular: plan.code === "STANDARD", // スタンダードを人気に設定
    };
    return acc;
  }, {} as Record<string, PlanInput & { popular: boolean; primaryColor?: string; secondaryColor?: string; accentColor?: string }>);

  const handlePlanChange = (planCode: UserPlan) => {
    // /plans ページは能動的にプランを選ぶ場所なので、成功時も現在地維持。
    // 詳細: docs/plan-change-navigation-spec.md 2-3 / .claude/rules/plan-change-navigation.md
    onChangePlan(planCode, { onSuccess: "stay" });
  };

  return (
    <div className="main-container">
      {/* ヘッダー */}
      <div className="page-title pt-3">{t("plans.pageTitle")}</div>

      {/* 認証状態表示 */}
      <div
        className="mb-6 p-4 rounded-lg text-center"
        style={{
          backgroundColor: planData[planCode].primaryColor,
          borderColor: planData[planCode].secondaryColor,
          borderWidth: "2px",
        }}
      >
        <div className="text-sm text-gray-600">{t("plans.currentStatus")}</div>
        <div className="font-bold text-lg">
          {getPlanDisplayName(planCode, t, planData[planCode].name)}
        </div>
        <div className="text-sm text-gray-500">¥{planData[planCode].price}</div>
        {!payload.user && (
          <div className="text-xs text-orange-600 mt-1">
            ⚠️ {t("auth.unauthenticatedNoticeShort")}
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
                {t("plans.recommended")}
              </div>
            )}

            {/* 認証必須バッジ */}
            {plan.requiresAuth && (
              <div className="absolute -top-2 right-4 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                {t("plans.authRequired")}
              </div>
            )}

            {/* プランヘッダー */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-bold text-lg">
                  {getPlanDisplayName(planKey, t, plan.name)}
                </div>
                <div className="text-sm text-gray-600">{plan.description}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-xl">¥{plan.price}</div>
                {planCode === planKey && (
                  <div
                    className="text-xs font-bold"
                    style={{ color: plan.accentColor }}
                  >
                    {t("plans.inUse")}
                  </div>
                )}
              </div>
            </div>

            {/* 機能リスト */}
            <div className="mb-4">
              <div className="text-sm font-bold mb-2">{t("plans.features")}</div>
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
                  {t("plans.currentlyInUse")}
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
                    ? t("plans.authenticating")
                    : planData[planCode].no < planData[planKey].no
                    ? t("plans.upgrade")
                    : t("plans.downgrade")}
                </button>
              )}
            </div>

            {/* 認証必須の説明 */}
            {planCode === "GUEST" && (
              <div className="mt-2 text-xs text-orange-600 text-center">
                {t("plans.guestSigninNotice")}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 注意事項 */}
      <div className="mt-6 p-3 bg-yellow-50 rounded-lg">
        <div className="text-xs text-yellow-800">
          <div className="font-bold mb-1">{t("plans.noticeTitle")}</div>
          <ul className="space-y-1">
            <li>{t("plans.noticeFree")}</li>
            <li>{t("plans.noticePaid")}</li>
            <li>{t("plans.noticeUpgrade")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PlansPage;
