import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type {
  AppJWTPayload,
  MasterData,
  Plan,
  UsageStats,
} from "../../../shared/lib/types";
import { useSalon } from "../lib/hooks/use-salon";
import type { UserPlan } from "../types";
import CategorySpreadSelector from "./category-spread-selector";
import CurrentPlanView from "./current-plan-view";
import LowerViewer from "./lower-viewer";
import TarotistCarouselPortrait from "./tarotist-carousel-portrait";
import UpgradeGuide from "./upgrade-guide";

interface SalonPageProps {
  payload: AppJWTPayload;
  currentPlan: Plan;
  masterData: MasterData;
  usageStats: UsageStats;
  onChangePlan: (plan: UserPlan) => void;
  onStartReading: () => void;
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
    init,
  } = useSalon();

  useEffect(() => {
    console.log("[SalonPage] Mounted");
    init();
  }, [init]);

  useEffect(() => {
    console.log("[SalonPage] isChangingPlan changed", isChangingPlan);
  }, [isChangingPlan]);

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
    onStartReading();
  };

  const [keyboardHeight, setKeyboardHeight] = useState(0);

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
            className="fixed left-0 right-0 h-[45vh]"
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
          <motion.div
            className="fixed left-0 right-0 px-1 h-[55vh] z-20 overflow-y-auto"
            style={{
              top: "calc(45vh + 50px + env(safe-area-inset-top))",
              bottom: 0,
            }}
            animate={{ y: -keyboardHeight }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {!currentPlan.hasPersonal && (
              <div className="pb-52">
                {/* カテゴリー・スプレッド選択 */}
                <CategorySpreadSelector
                  handleStartReading={handleStartReading}
                />

                {/* プランアップグレード案内 */}
                <UpgradeGuide
                  handleChangePlan={handleChangePlan}
                  isChangingPlan={isChangingPlan}
                />
              </div>
            )}
            {currentPlan.hasPersonal && (
              <LowerViewer
                onKeyboardHeightChange={setKeyboardHeight}
                handleChangePlan={handleChangePlan}
                handleStartReading={handleStartReading}
                isChangingPlan={isChangingPlan}
                onBack={() => {}}
              />
            )}
          </motion.div>
        </>
      )}
    </div>
  );
};

export default SalonPage;
