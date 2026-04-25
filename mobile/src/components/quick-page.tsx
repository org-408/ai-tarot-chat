import type { PluginListenerHandle } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AppJWTPayload,
  MasterData,
  Plan,
  UsageStats,
} from "../../../shared/lib/types";
import { useReading } from "../lib/hooks/use-reading";
import type { UserPlan } from "../types";
import CategorySpreadSelector from "./category-spread-selector";
import TarotistCarouselPortrait from "./tarotist-carousel-portrait";

interface QuickPageProps {
  payload: AppJWTPayload;
  currentPlan: Plan;
  masterData: MasterData;
  usageStats: UsageStats;
  onChangePlan: (
    plan: UserPlan,
    options?: { onSuccess?: "history" | "personal" | "stay" | "portrait" },
  ) => void;
  onStartReading: () => void;
  isChangingPlan: boolean;
  /** プラン失効ダイアログ/トーストが表示中か（チュートリアル発火ブロック用） */
  isPlanExpiredShowing: boolean;
}

const QuickPage: React.FC<QuickPageProps> = ({
  currentPlan,
  masterData,
  usageStats,
  onChangePlan,
  isChangingPlan,
  isPlanExpiredShowing,
  onStartReading,
}) => {
  const {
    selectedTargetMode,
    selectedTarotist,
    quickCategory,
    quickSpread,
    setSelectedTarotist,
    setSelectedTargetMode,
    init,
  } = useReading();

  useEffect(() => {
    console.log("[QuickPage] Mounted");
    init();
  }, [init]);

  useEffect(() => {
    console.log("[QuickPage] isChangingPlan changed", isChangingPlan);
  }, [isChangingPlan]);

  useMemo(() => {
    console.log("[QuickPage] masterData or usageStats changed", {
      masterData,
      usageStats,
    });
  }, [masterData, usageStats]);

  const handleChangePlan = (targetPlan: UserPlan) => {
    // 占い師選択モードからのアップグレード → 成功時は portrait モードに切替（その占い師で占う状態へ）。
    // モード切替は TarotistCarouselPortrait 内の handleSelectTarotist で行うため、
    // 親の handleChangePlan 側では遷移しない。Cancel/Fail は tarotist モード維持。
    // 詳細: docs/plan-change-navigation-spec.md 2-1 / .claude/rules/plan-change-navigation.md
    onChangePlan(targetPlan, { onSuccess: "portrait" });
  };

  const handleStartReading = () => {
    console.log("[QuickPage] handleStartReading called");
    if (!selectedTarotist || !quickSpread || !quickCategory) return;
    onStartReading();
  };

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isTopCollapsed, setIsTopCollapsed] = useState(false);

  // キーボード高さを検出して下半分を持ち上げる（chat-panel.tsx と同じパターン）。
  // クイック占いの自由入力欄にフォーカスしたときにキーボードで隠れないように。
  useEffect(() => {
    let showListener: PluginListenerHandle | undefined;
    let hideListener: PluginListenerHandle | undefined;

    const setupCapacitorListeners = async () => {
      try {
        showListener = await Keyboard.addListener("keyboardWillShow", (info) => {
          setKeyboardHeight(info.keyboardHeight);
        });
        hideListener = await Keyboard.addListener("keyboardWillHide", () => {
          setKeyboardHeight(0);
        });
      } catch {
        // Web 環境（npm run dev）は Capacitor Keyboard 不在なので visualViewport にフォールバック
      }
    };
    setupCapacitorListeners();

    const handleResize = () => {
      if (window.visualViewport) {
        const offset = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(offset > 0 ? offset : 0);
      }
    };
    window.visualViewport?.addEventListener("resize", handleResize);

    return () => {
      showListener?.remove();
      hideListener?.remove();
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  // クイック占いチュートリアル（セレクターへのコーチマーク）
  // サロン画面ライフサイクルで保持することで、占い師選択モード ↔ portrait モードの
  // 往復による CategorySpreadSelector 再マウントでも再発火しない。
  const coachShownRef = useRef(false);
  const [coachMarkOpen, setCoachMarkOpen] = useState(false);
  const isPlanDialogShowing = isChangingPlan || isPlanExpiredShowing;

  return (
    <div className="main-container">
      {/* 占い師選択モード */}
      {selectedTargetMode === "tarotist" ? (
        // portrait モードと同じ fixed ラッパーで viewport 全高を明示する。
        // .main-container は min-height: 100% なので、子の height: 100% が
        // 解決できず、カルーセル内部のスワイプヒント/ドットインジケーターが
        // viewport からはみ出していたため揃える。
        // bottom は --safe-bottom（iOS: env()、Android: MainActivity で注入）で
        // ホームバー/ジェスチャバーを避け、最下部のドットインジケーターが
        // タップできなくなる問題を防ぐ。
        <div
          className="fixed left-0 right-0 flex flex-col"
          style={{
            top: "calc(50px + env(safe-area-inset-top))",
            bottom: "var(--safe-bottom)",
          }}
        >
          <TarotistCarouselPortrait
            masterData={masterData}
            currentPlan={currentPlan}
            selectedTarotist={selectedTarotist}
            onSelectTarotist={setSelectedTarotist}
            selectedMode={selectedTargetMode}
            onChangeMode={setSelectedTargetMode}
            onChangePlan={handleChangePlan}
            isChangingPlan={isChangingPlan}
          />
        </div>
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
                selectedTarotist={selectedTarotist}
                onSelectTarotist={setSelectedTarotist}
                selectedMode={selectedTargetMode}
                onChangeMode={setSelectedTargetMode}
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
                  isPlanDialogShowing={isPlanDialogShowing}
                  coachShownRef={coachShownRef}
                  coachMarkOpen={coachMarkOpen}
                  setCoachMarkOpen={setCoachMarkOpen}
                />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
};

export default QuickPage;
