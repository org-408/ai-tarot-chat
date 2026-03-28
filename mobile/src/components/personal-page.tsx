import type { UIMessage } from "ai";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type {
  AppJWTPayload,
  MasterData,
  Plan,
} from "../../../shared/lib/types";
import { useClient } from "../lib/hooks/use-client";
import { useSalon } from "../lib/hooks/use-salon";
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
  onChangePlan: (plan: UserPlan) => void;
  onBack: () => void;
  isChangingPlan: boolean;
}

const PersonalPage: React.FC<PersonalPageProps> = ({
  currentPlan,
  masterData,
  onChangePlan,
  onBack,
}) => {
  const {
    selectedTargetMode,
    selectedTarotist,
    selectedSpread,
    drawnCards,
    setDrawnCards,
    isRevealingCompleted,
    setUpperViewerMode,
    setIsPersonal,
    init,
  } = useSalon();

  const { remainingPersonal } = useClient();
  const canStartPersonal = remainingPersonal > 0;

  const [phase, setPhase] = useState<"chat" | "reading">("chat");
  const [phase1Messages, setPhase1Messages] = useState<UIMessage[]>([]);

  // chatResetKey: null = まだ準備中（ChatPanel をマウントしない）、number = Phase1 ChatPanel のキー
  const [chatResetKey, setChatResetKey] = useState<number | null>(null);

  // 初回マウント: 残回数がある場合のみ init → isPersonal=true → ChatPanel マウント許可
  useEffect(() => {
    if (!canStartPersonal) return;
    init();
    setIsPersonal(true);
    setChatResetKey(0);
  }, [canStartPersonal, init, setIsPersonal]);

  // Reading phase 開始時にカードを引く
  useEffect(() => {
    if (phase === "reading" && masterData && selectedSpread) {
      const cards = drawRandomCards(masterData, selectedSpread);
      setDrawnCards(cards);
    }
  }, [phase, masterData, selectedSpread, setDrawnCards]);

  // カードめくり完了時の処理
  useEffect(() => {
    if (isRevealingCompleted) {
      setUpperViewerMode("profile");
    }
  }, [isRevealingCompleted, setUpperViewerMode]);

  // Phase1 → Phase2 へ（ページ遷移なし）
  const handleStartReading = () => {
    if (!selectedTarotist || !selectedSpread) return;
    setPhase("reading");
  };

  // Phase2 完了後の戻る → PersonalPage を離れる
  // （利用制限到達後に再チャットを始めてしまうことを防ぐ）
  const handleBackFromReading = () => {
    setUpperViewerMode("grid");
    onBack();
  };

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ===== Reading Phase =====
  if (phase === "reading") {
    return (
      <div className="main-container">
        <ShuffleDialog
          isOpen={!drawnCards || drawnCards.length === 0}
          onComplete={() => {}}
        />

        {/* 上半分：カード */}
        <div
          className="fixed left-0 right-0 z-10"
          style={{
            top: "calc(50px + env(safe-area-inset-top))",
            height: "45vh",
          }}
        >
          {drawnCards.length > 0 && <UpperViewer />}
        </div>

        {/* 下半分：Phase2 チャット */}
        <div
          className="fixed left-0 right-0 overflow-auto"
          style={{
            top: "calc(45vh + 50px + env(safe-area-inset-top))",
            bottom: 0,
          }}
        >
          {drawnCards.length > 0 && (
            <ChatPanel
              key={`personal-phase2-${chatResetKey}`}
              initialMessages={phase1Messages}
              onBack={handleBackFromReading}
            />
          )}
        </div>
      </div>
    );
  }

  // ===== Chat Phase =====
  return (
    <div className="main-container">
      {selectedTargetMode === "tarotist" ? (
        <TarotistCarouselPortrait
          masterData={masterData}
          currentPlan={currentPlan}
          onChangePlan={onChangePlan}
          isChangingPlan={false}
        />
      ) : (
        <>
          {/* 上半分：占い師肖像画 */}
          <div
            className="fixed left-0 right-0 h-[45vh]"
            style={{
              top: "calc(50px + env(safe-area-inset-top))",
            }}
          >
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
            {/* 残回数ゼロ → チャットをマウントせず案内を表示 */}
            {!canStartPersonal && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
                <p className="text-gray-600 text-sm">
                  本日のパーソナル占いは終了しました。
                  <br />
                  明日またお越しください。
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
                />
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
};

export default PersonalPage;
