import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
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
import TarotistCarouselPortrait from "./tarotist-carousel-portrait";

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
    onStartReading();
  };

  const [keyboardHeight] = useState(0);
  const [isTopCollapsed, setIsTopCollapsed] = useState(false);

  return (
    <div className="main-container">
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
          {/* 上下統合ラッパー */}
          <div
            className="fixed left-0 right-0 flex flex-col"
            style={{
              top: "calc(50px + env(safe-area-inset-top))",
              bottom: 0,
            }}
          >
            {/* 上半分（アコーディオン） */}
            <motion.div
              className="overflow-hidden flex-shrink-0"
              animate={{ height: isTopCollapsed ? 0 : "45vh" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <TarotistCarouselPortrait
                masterData={masterData}
                currentPlan={currentPlan}
              />
            </motion.div>

            {/* アコーディオントグル */}
            <button
              type="button"
              onClick={() => setIsTopCollapsed((v) => !v)}
              className="flex-shrink-0 w-full h-7 flex items-center justify-center z-30"
            >
              <div className="bg-gray-200/80 rounded-full px-3 py-0.5 flex items-center">
                <motion.div
                  animate={{ rotate: isTopCollapsed ? 0 : 180 }}
                  transition={{ duration: 0.25 }}
                >
                  <ChevronDown size={14} className="text-gray-500" />
                </motion.div>
              </div>
            </button>

            {/* 下半分 */}
            <motion.div
              className="flex-1 min-h-0 px-1 flex flex-col"
              animate={{ y: -keyboardHeight }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* クイック占い（スクロール可能） */}
              <div className="flex-1 overflow-y-auto pb-52">
                <CategorySpreadSelector
                  handleStartReading={handleStartReading}
                />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
};

export default SalonPage;
