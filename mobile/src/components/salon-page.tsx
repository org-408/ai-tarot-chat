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
import { ChatPanel } from "./chat-panel";
import CurrentPlanView from "./current-plan-view";
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
    isPersonal,
    setIsPersonal,
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
    if (!selectedTarotist || !selectedSpread) return;
    if (!isPersonal && !selectedCategory) return;
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
            className="fixed left-0 right-0 px-1 z-20 flex flex-col"
            style={{
              top: "calc(45vh + 50px + env(safe-area-inset-top))",
              bottom: 0,
            }}
            animate={{ y: -keyboardHeight }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* タブ切り替え（PREMIUM のみ・上部固定） */}
            {currentPlan.hasPersonal && (
              <div className="flex-shrink-0 w-full flex justify-center gap-3 p-1">
                {(["selector", "personal"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setIsPersonal(mode === "personal")}
                    className={`w-24 h-4 text-xs rounded-full transition-all ${
                      (mode === "personal") === isPersonal
                        ? "bg-purple-400/70"
                        : "bg-purple-200/40"
                    }`}
                  >
                    {mode === "selector" ? "クイック占い" : "パーソナル占い"}
                  </button>
                ))}
              </div>
            )}

            {/* クイック占い（共通・スクロール可能） */}
            {!isPersonal && (
              <div className="flex-1 overflow-y-auto pb-52">
                <CategorySpreadSelector
                  handleStartReading={handleStartReading}
                />
                <UpgradeGuide
                  handleChangePlan={handleChangePlan}
                  isChangingPlan={isChangingPlan}
                />
              </div>
            )}

            {/* パーソナル占い（PREMIUM のみ・入力欄下部固定） */}
            {currentPlan.hasPersonal && isPersonal && (
              <div className="flex-1 min-h-0">
                <ChatPanel
                  key="personal"
                  onKeyboardHeightChange={setKeyboardHeight}
                  handleStartReading={handleStartReading}
                  onBack={() => setIsPersonal(false)}
                />
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
};

export default SalonPage;
