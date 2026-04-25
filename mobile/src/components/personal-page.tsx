import type { UIMessage } from "ai";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import SpotlightCoachMark from "../../../shared/components/ui/spotlight-coach-mark";
import type {
  AppJWTPayload,
  MasterData,
  Plan,
} from "../../../shared/lib/types";
import { useClient } from "../lib/hooks/use-client";
import { useSalon } from "../lib/hooks/use-salon";
import { showInterstitialAd } from "../lib/utils/admob";
import { drawRandomCards } from "../lib/utils/salon";
import type { UserPlan } from "../types";
import { ChatPanel } from "./chat-panel";
import ShuffleDialog from "./shuffle-dialog";
import TarotistCarouselPortrait from "./tarotist-carousel-portrait";
import UpperViewer from "./upper-viewer";

interface PersonalPageProps {
  payload: AppJWTPayload;
  currentPlan: Plan;
  masterData: MasterData;
  onChangePlan: (
    plan: UserPlan,
    options?: { onSuccess?: "history" | "personal" | "stay" | "portrait" },
  ) => void;
  onBack: () => void;
  /** Phase2 開始時（AI API 課金開始）にナビゲーションをロックする */
  onStartReading: () => void;
  /** Phase2 完了時（AI API 課金終了）にナビゲーションロックを解除する */
  onCompleteReading: () => void;
  isChangingPlan: boolean;
  onNavigateToClara?: () => void;
}

/** スプレッドビューを表示してからプロフィールへ切り替えるまでの時間 (ms) */
const SPREAD_VIEW_DISPLAY_MS = 2000;

const PersonalPage: React.FC<PersonalPageProps> = ({
  currentPlan,
  masterData,
  onChangePlan,
  onBack,
  onStartReading,
  onCompleteReading,
  onNavigateToClara,
}) => {
  const { t } = useTranslation();
  const {
    selectedPersonalTargetMode,
    selectedPersonalTarotist,
    personalSpread,
    drawnCards,
    setDrawnCards,
    isRevealingCompleted,
    setIsRevealingCompleted,
    setSelectedPersonalTarotist,
    setUpperViewerMode,
    setSelectedPersonalTargetMode,
    setIsPersonal,
    init,
  } = useSalon();

  const { remainingPersonal, personalOnboardedAt, markOnboarded } = useClient();
  const debugMode = import.meta.env.VITE_DEBUG_MODE === "true";
  const canStartPersonal = debugMode || remainingPersonal > 0;

  // オンボーディング: 未実施 (personalOnboardedAt===null) の場合のみ 2 段で表示
  //   idle        : まだ ChatPanel の onInputReady が発火していない
  //   stage1      : 入力案内 (AI 初回挨拶完了 → 入力欄が表示された)
  //   waiting     : Stage1 dismiss 後、スプレッド選択セクションの完全可視化を待機
  //   stage2      : おすすめスプレッド案内 → dismiss でフラグを立てて done
  //   done        : 完了 (既に実施済み or 今セッションで完了)
  type OnboardingStage = "idle" | "stage1" | "waiting" | "stage2" | "done";
  const [onboardingStage, setOnboardingStage] = useState<OnboardingStage>(
    personalOnboardedAt ? "done" : "idle"
  );
  const markedRef = useRef(false);
  useEffect(() => {
    if (personalOnboardedAt) {
      setOnboardingStage("done");
      markedRef.current = true;
    }
  }, [personalOnboardedAt]);

  // コーチマークのターゲット DOM（ChatPanel 経由で受け取る）
  const [inputEl, setInputEl] = useState<HTMLElement | null>(null);
  const [selectorEl, setSelectorEl] = useState<HTMLElement | null>(null);

  const [phase, setPhase] = useState<"chat" | "reading">("chat");
  const [phase1Messages, setPhase1Messages] = useState<UIMessage[]>([]);

  // chatResetKey: null = まだ準備中（ChatPanel をマウントしない）、number = Phase1 ChatPanel のキー
  const [chatResetKey, setChatResetKey] = useState<number | null>(null);

  // 初回マウント: 残回数がある場合のみ init → isPersonal=true → ChatPanel マウント許可
  useEffect(() => {
    if (!canStartPersonal) return;
    setPhase("chat");
    setPhase1Messages([]);
    init();
    setIsPersonal(true); // init() が isPersonal:false をセットするため必ず後に上書き
    // パーソナル専用占い師が未選択 or 非PREMIUM なら占い師選択画面へ強制遷移
    if (!selectedPersonalTarotist || selectedPersonalTarotist.plan?.code !== "PREMIUM") {
      setSelectedPersonalTargetMode("tarotist");
    }
    setChatResetKey((current) => (current === null ? 0 : current + 1));
    // selectedPersonalTarotist.plan?.code はセッション中の再初期化を防ぐため意図的に除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canStartPersonal, init, setIsPersonal, setSelectedPersonalTargetMode]);

  // アンマウント時のみ isPersonal をリセット（canStartPersonal 変化時には発火させない）
  useEffect(() => {
    return () => setIsPersonal(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // アンマウント時の安全網: 異常終了・強制ナビゲーション時にロックを必ず解除
  useEffect(() => {
    return () => {
      onCompleteReading();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ChatPanel から渡される「入力欄が表示された」シグナル
  const handleChatInputReady = () => {
    setOnboardingStage((prev) => (prev === "idle" ? "stage1" : prev));
  };

  // ChatPanel から渡される「スプレッド選択セクションが完全可視+スクロール停止」シグナル
  const handleSelectorFullyVisible = () => {
    setOnboardingStage((prev) => (prev === "waiting" ? "stage2" : prev));
  };

  const handleOnboardingStage1Dismiss = () => {
    setOnboardingStage((prev) => (prev === "stage1" ? "waiting" : prev));
  };
  const handleOnboardingStage2Dismiss = () => {
    setOnboardingStage("done");
    if (!markedRef.current) {
      markedRef.current = true;
      void markOnboarded("personal");
    }
  };

  // Reading phase 開始時にカードを引く
  useEffect(() => {
    if (phase === "reading" && masterData && personalSpread) {
      const cards = drawRandomCards(masterData, personalSpread);
      setDrawnCards(cards);
    }
  }, [phase, masterData, personalSpread, setDrawnCards]);

  // カードめくり完了時の処理（めくれたカードが見える時間を確保してからプロフィールへ切替）
  useEffect(() => {
    if (isRevealingCompleted) {
      const t = setTimeout(() => setUpperViewerMode("profile"), SPREAD_VIEW_DISPLAY_MS);
      return () => clearTimeout(t);
    }
  }, [isRevealingCompleted, setUpperViewerMode]);

  // パーソナル占いではカードが揃ったら自動で全枚めくる
  useEffect(() => {
    if (phase !== "reading" || drawnCards.length === 0) return;
    const t = setTimeout(() => setIsRevealingCompleted(true), 500);
    return () => clearTimeout(t);
  }, [phase, drawnCards.length, setIsRevealingCompleted]);

  // Phase1 → Phase2 へ（無料プランのみ広告表示 → 閉じてから遷移）
  // Phase2 開始 = AI API 課金開始 → ナビゲーションをロック
  const handleStartReading = async () => {
    if (!selectedPersonalTarotist || !personalSpread) return;
    if (selectedPersonalTarotist.provider === "OFFLINE") {
      onNavigateToClara?.();
      return;
    }
    const isPaidPlan =
      currentPlan.code === "STANDARD" || currentPlan.code === "PREMIUM";
    if (!isPaidPlan) {
      await showInterstitialAd();
    }
    onStartReading(); // AI 課金開始 → ナビゲーションロック
    setPhase("reading");
  };

  // Phase2 完了後の戻る → PersonalPage を離れる
  // ロック解除は ChatPanel の onUnlock が担当（AI 完了タイミングで呼ばれる）
  const handleBackFromReading = () => {
    setUpperViewerMode("grid");
    init();
    onBack();
  };

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isTopCollapsed, setIsTopCollapsed] = useState(false);

  // ===== Reading Phase =====
  if (phase === "reading") {
    return (
      <div className="main-container">
        <ShuffleDialog
          isOpen={!drawnCards || drawnCards.length === 0}
          onComplete={() => {}}
        />

        {/* 上下統合ラッパー */}
        <div
          className="fixed left-0 right-0 flex flex-col"
          style={{
            top: "calc(50px + env(safe-area-inset-top))",
            bottom: 0,
          }}
        >
          {/* 上半分：カード（アコーディオン） */}
          <motion.div
            className="overflow-hidden flex-shrink-0"
            animate={{ height: isTopCollapsed ? 0 : "45vh" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {drawnCards.length > 0 && personalSpread && (
              <UpperViewer spread={personalSpread} />
            )}
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

          {/* 下半分：Phase2 チャット（キーボード対応） */}
          <motion.div
            className="flex-1 min-h-0 flex flex-col"
            animate={{ y: -keyboardHeight }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {drawnCards.length > 0 && (
              <div className="flex-1 min-h-0">
                <ChatPanel
                  key={`personal-phase2-${chatResetKey}`}
                  initialMessages={phase1Messages}
                  onKeyboardHeightChange={setKeyboardHeight}
                  onBack={handleBackFromReading}
                  onUnlock={onCompleteReading}
                  remainingCount={remainingPersonal}
                />
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // ===== Chat Phase =====
  return (
    <div className="main-container">
      {selectedPersonalTargetMode === "tarotist" ? (
        // portrait モードと同じ fixed ラッパーで viewport 全高を明示する。
        // .main-container は min-height: 100% なので、子の height: 100% が
        // 解決できず、カルーセル内部のスワイプヒント/ドットインジケーターが
        // viewport からはみ出すため揃える（salon-page.tsx と同じ対応）。
        <div
          className="fixed left-0 right-0 flex flex-col"
          style={{
            top: "calc(50px + env(safe-area-inset-top))",
            bottom: 0,
          }}
        >
          <TarotistCarouselPortrait
            masterData={masterData}
            currentPlan={currentPlan}
            selectedTarotist={selectedPersonalTarotist}
            onSelectTarotist={setSelectedPersonalTarotist}
            selectedMode={selectedPersonalTargetMode}
            onChangeMode={setSelectedPersonalTargetMode}
            isPersonal
            onChangePlan={onChangePlan}
            isChangingPlan={false}
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
            {/* 上半分：占い師肖像画（アコーディオン） */}
            <motion.div
              className="overflow-hidden flex-shrink-0"
              animate={{ height: isTopCollapsed ? 0 : "45vh" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <TarotistCarouselPortrait
                masterData={masterData}
                currentPlan={currentPlan}
                selectedTarotist={selectedPersonalTarotist}
                onSelectTarotist={setSelectedPersonalTarotist}
                selectedMode={selectedPersonalTargetMode}
                onChangeMode={setSelectedPersonalTargetMode}
                isPersonal
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
              className="flex-1 min-h-0 px-1 z-20 flex flex-col"
              animate={{ y: -keyboardHeight }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* 残回数ゼロ → チャットをマウントせず案内を表示 */}
              {!canStartPersonal && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
                  <p className="text-gray-600 text-sm">
                    {t("personal.dailyLimitReached")}
                    <br />
                    {t("personal.comeBackTomorrow")}
                  </p>
                </div>
              )}

              {/* 残回数あり → Phase1 チャット（isPersonal=true 確定後にマウント） */}
              {canStartPersonal && chatResetKey !== null && (
                <div className="flex-1 min-h-0">
                  <ChatPanel
                    key={`personal-phase1-${chatResetKey}`}
                    onKeyboardHeightChange={setKeyboardHeight}
                    handleStartReading={handleStartReading}
                    onMessagesChange={setPhase1Messages}
                    onBack={() => {}}
                    onInputReady={handleChatInputReady}
                    onSelectorFullyVisible={handleSelectorFullyVisible}
                    onInputElChange={setInputEl}
                    onSelectorElChange={setSelectorEl}
                  />
                </div>
              )}
            </motion.div>
          </div>

          {/* オンボーディング Stage1: 入力欄をスポットライト */}
          <SpotlightCoachMark
            isOpen={onboardingStage === "stage1"}
            targetEl={inputEl}
            title={t("personal.coachStage1Title")}
            note={t("personal.coachStage1Note")}
            dismissHint={t("common.tapToDismiss")}
            onDismiss={handleOnboardingStage1Dismiss}
          />

          {/* オンボーディング Stage2: スプレッド選択セクション全体をスポットライト */}
          <SpotlightCoachMark
            isOpen={onboardingStage === "stage2"}
            targetEl={selectorEl}
            title={t("personal.coachStage2Title")}
            note={t("personal.coachStage2Note")}
            dismissHint={t("common.tapToDismiss")}
            onDismiss={handleOnboardingStage2Dismiss}
          />
        </>
      )}
    </div>
  );
};

export default PersonalPage;
