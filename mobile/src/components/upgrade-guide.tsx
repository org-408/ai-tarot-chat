import { useTranslation } from "react-i18next";
import type { Plan } from "../../../shared/lib/types";
import { useClient } from "../lib/hooks/use-client";
import { useMaster } from "../lib/hooks/use-master";
import { usePlanPrices } from "../lib/hooks/use-plan-prices";
import { getPlanDisplayName } from "../lib/utils/plan-display";
import { formatPlanPrice } from "../lib/utils/plan-price";
import { getPlanColors } from "../lib/utils/reading-helpers";
import type { UserPlan } from "../types";
import Accordion, { type AccordionItem } from "./accordion";

interface UpgradeGuideProps {
  handleChangePlan: (targetPlan: UserPlan) => void;
  isChangingPlan: boolean;
}

const UpgradeGuide: React.FC<UpgradeGuideProps> = ({
  handleChangePlan,
  isChangingPlan,
}) => {
  const { t } = useTranslation();
  // 現在言語で解決された plans を使用 (display 用の name/description/features が
  // EN モードで英語になる)
  const { plans: resolvedPlans } = useMaster();
  const { currentPlan } = useClient();
  // RevenueCat のロケール通貨フォーマット済み価格 (例: ¥480 / $9.99)
  const formattedPrices = usePlanPrices();

  const isGuest = currentPlan!.code === "GUEST";

  const upgradablePlans = resolvedPlans
    ?.filter((p: Plan) => p.no > (currentPlan?.no || 0))
    .sort((a: { no: number }, b: { no: number }) => a.no - b.no);

  const accordionItems: AccordionItem[] = upgradablePlans.map((plan) => {
    const colors = getPlanColors(plan.code, resolvedPlans);
    const icon =
      plan.code === "PREMIUM" ? "👑" : plan.code === "STANDARD" ? "💎" : "🆓";

    const displayName = getPlanDisplayName(plan.code, t, plan.name);
    const priceDisplay = formatPlanPrice(
      plan.code,
      plan.price,
      formattedPrices,
      t,
    );
    return {
      id: plan.code,
      title: displayName,
      subtitle: t("plans.priceSubtitle", {
        price: priceDisplay,
        description: plan.description,
      }),
      icon,
      colors,
      content: (
        <>
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

          <button
            onClick={() => handleChangePlan(plan.code as UserPlan)}
            disabled={isChangingPlan}
            className="w-full mt-2 py-2 text-white rounded text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: colors.accent }}
          >
            {isChangingPlan
              ? t("plans.processing")
              : isGuest && plan.code === "FREE"
              ? t("plans.freeRegister")
              : t("plans.startPlan", {
                  plan: displayName,
                  price: priceDisplay,
                })}
          </button>
        </>
      ),
    };
  });

  return (
    <div className="mt-6 space-y-3">
      {currentPlan.code !== "PREMIUM" && (
        <div className="text-center text-sm text-gray-800 mb-3">
          {t("plans.upgradeHeadline")}
          {upgradablePlans && upgradablePlans.length > 0 && (
            <div className="mt-1 space-y-3">
              <div className="text-xs text-center text-gray-800">
                💡{" "}
                {isGuest
                  ? t("plans.upgradeHintGuest")
                  : t("plans.upgradeHintOther")}
              </div>

              <Accordion items={accordionItems} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UpgradeGuide;
