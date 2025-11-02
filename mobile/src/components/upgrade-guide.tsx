import type { Plan } from "../../../shared/lib/types";
import { useClient } from "../lib/hooks/use-client";
import { useMaster } from "../lib/hooks/use-master";
import { getPlanColors } from "../lib/utils/salon";
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
  const { masterData } = useMaster();
  const { currentPlan } = useClient();

  const isGuest = currentPlan!.code === "GUEST";

  const upgradablePlans = masterData!.plans
    ?.filter((p: Plan) => p.no > (currentPlan?.no || 0))
    .sort((a: { no: number }, b: { no: number }) => a.no - b.no);

  // Accordionのitems配列を作成
  const accordionItems: AccordionItem[] = upgradablePlans.map((plan) => {
    const colors = getPlanColors(plan.code, masterData.plans);
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
        <div className="text-center text-sm text-gray-800 mb-3">
          💡 もっと詳しく占うなら
          {upgradablePlans && upgradablePlans.length > 0 && (
            <div className="mt-1 space-y-3">
              <div className="text-xs text-center text-gray-800">
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

export default UpgradeGuide;
