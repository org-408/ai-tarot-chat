import type {
  AppJWTPayload,
  MasterData,
  Plan,
  UsageStats,
} from "../../../shared/lib/types";
import { getPlanColors } from "../lib/utils/salon";

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

export default CurrentPlanView;
