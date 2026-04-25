import { useMemo } from "react";
import type {
  AppJWTPayload,
  MasterData,
  Plan,
  UsageStats,
} from "../../../shared/lib/types";
import { useMaster } from "../lib/hooks/use-master";
import { getPlanColors } from "../lib/utils/reading-helpers";

interface CurrentPlanViewProps {
  masterData: MasterData;
  currentPlan: Plan;
  payload: AppJWTPayload;
  usageStats: UsageStats;
}

const CurrentPlanView: React.FC<CurrentPlanViewProps> = ({
  masterData,
  currentPlan,
  payload,
  usageStats,
}) => {
  // currentPlan は client store 由来で保存時点の言語版。現在言語に解決する。
  const { plans: resolvedPlans } = useMaster();
  const resolvedPlan = useMemo(
    () =>
      resolvedPlans.find((p) => p.code === currentPlan?.code) ?? currentPlan,
    [resolvedPlans, currentPlan],
  );
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

  const currentColors = getPlanColors(currentPlan!.code, masterData.plans);
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
            {getPlanIcon()} {resolvedPlan?.name}
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
          通常: {usageStats.remainingReadings}回
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

export default CurrentPlanView;
