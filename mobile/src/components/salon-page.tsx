import { useEffect, useMemo } from "react";
import type {
  AppJWTPayload,
  MasterData,
  Plan,
  ReadingCategory,
  Spread,
  Tarotist,
  UsageStats,
} from "../../../shared/lib/types";
import { useSalon } from "../lib/hooks/use-salon";
import type { UserPlan } from "../types";
import CategorySpreadSelector from "./category-spread-selector";
import CurrentPlanView from "./current-plan-view";
import TarotistCarouselPortrait from "./tarotist-carousel-portrait";
import UpgradeGuide from "./upgrade-guide";

interface SalonPageProps {
  payload: AppJWTPayload;
  currentPlan: Plan;
  masterData: MasterData;
  usageStats: UsageStats;
  onChangePlan: (plan: UserPlan) => void;
  onStartReading: (
    tarotist: Tarotist,
    category: ReadingCategory,
    spread: Spread
  ) => void;
  isChangingPlan: boolean;
}

const SalonPage: React.FC<SalonPageProps> = ({
  payload,
  currentPlan,
  masterData,
  usageStats,
  onChangePlan,
  isChangingPlan,
  onStartReading,
}) => {
  const {
    selectedTargetMode,
    selectedTarotist,
    selectedCategory,
    selectedSpread,
  } = useSalon();

  useEffect(() => {
    console.log("[SalonPage] isChangingPlan changed", isChangingPlan);
  }, [isChangingPlan]);

  const upgradablePlans = masterData!.plans
    ?.filter((p: Plan) => p.no > (currentPlan?.no || 0))
    .sort((a: { no: number }, b: { no: number }) => a.no - b.no);

  useMemo(() => {
    console.log("[SalonPage] masterData or usageStats changed", {
      masterData,
      usageStats,
    });
  }, [masterData, usageStats]);

  const handleChangePlan = (targetPlan: UserPlan) => {
    onChangePlan(targetPlan);
  };

  const handleStartReading = () => {
    console.log("[SalonPage] handleStartReading called");
    if (!selectedTarotist || !selectedSpread || !selectedCategory) return;
    // onStartReading 実施
    onStartReading(selectedTarotist, selectedCategory, selectedSpread);
  };

  return (
    <div className="main-container">
      {/* カレントプラン表示 */}
      {selectedTargetMode === "spread" && (
        <CurrentPlanView
          masterData={masterData}
          currentPlan={currentPlan}
          payload={payload}
          usageStats={usageStats}
        />
      )}

      {/* 占い師選択モード */}
      {selectedTargetMode === "tarotist" ? (
        <TarotistCarouselPortrait
          masterData={masterData}
          currentPlan={currentPlan}
          onChangePlan={handleChangePlan}
          isChangingPlan={isChangingPlan}
        />
      ) : (
        <>
          {/* 上半分 */}
          <div
            className="fixed left-0 right-0 h-[45vh] z-10"
            style={{
              top: "calc(50px + env(safe-area-inset-top))",
            }}
          >
            {/* 占い師肖像画モード */}
            <TarotistCarouselPortrait
              masterData={masterData}
              currentPlan={currentPlan}
            />
          </div>

          {/* 下半分 */}
          <div
            className="fixed left-0 right-0 overflow-auto px-1 pb-25"
            style={{
              top: "calc(45vh + 50px + env(safe-area-inset-top))",
              bottom: 0,
            }}
          >
            {/* カテゴリー・スプレッド選択 */}
            <CategorySpreadSelector
              masterData={masterData}
              currentPlan={currentPlan}
              handleStartReading={handleStartReading}
            />

            {/* プランアップグレード案内 */}
            <UpgradeGuide
              masterData={masterData}
              currentPlan={currentPlan}
              upgradablePlans={upgradablePlans}
              handleChangePlan={handleChangePlan}
              isChangingPlan={isChangingPlan}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default SalonPage;
