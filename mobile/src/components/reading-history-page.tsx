import { motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Reading } from "../../../shared/lib/types";
import { useSalon } from "../lib/hooks/use-salon";
import { chatMessagesToUIMessages } from "../lib/utils/chat-messages";
import { MessageContent } from "./message-content";
import UpperViewer from "./upper-viewer";

interface ReadingHistoryPageProps {
  reading: Reading;
  onClose: () => void;
}

const ReadingHistoryPage: React.FC<ReadingHistoryPageProps> = ({ reading, onClose }) => {
  const {
    drawnCards,
    selectedSpread,
    selectedTarotist,
    isRevealingCompleted,
    upperViewerMode,
    isPersonal,
    setDrawnCards,
    setSelectedSpread,
    setSelectedTarotist,
    setIsRevealingCompleted,
    setUpperViewerMode,
    setIsPersonal,
  } = useSalon();

  // サロンストアに履歴リーディングのデータをセットし、アンマウント時に復元する
  useEffect(() => {
    const saved = {
      drawnCards,
      selectedSpread,
      selectedTarotist,
      isRevealingCompleted,
      upperViewerMode,
      isPersonal,
    };

    setDrawnCards(reading.cards ?? []);
    if (reading.spread) setSelectedSpread(reading.spread);
    if (reading.tarotist) setSelectedTarotist(reading.tarotist);
    setIsRevealingCompleted(true);
    setUpperViewerMode("grid");
    setIsPersonal(!!reading.customQuestion);

    return () => {
      setDrawnCards(saved.drawnCards);
      setSelectedSpread(saved.selectedSpread);
      setSelectedTarotist(saved.selectedTarotist);
      setIsRevealingCompleted(saved.isRevealingCompleted);
      setUpperViewerMode(saved.upperViewerMode);
      setIsPersonal(saved.isPersonal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messages = chatMessagesToUIMessages(reading.chatMessages ?? []);
  const [isTopCollapsed, setIsTopCollapsed] = useState(false);

  return (
    <div className="main-container">
      {/* ❌ 閉じるボタン（ヘッダー右上） */}
      <button
        type="button"
        onClick={onClose}
        className="fixed right-4 z-[100] w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
      >
        <X size={18} className="text-gray-500" />
      </button>

      {/* コンテンツエリア */}
      <div
        className="fixed left-0 right-0 flex flex-col"
        style={{
          top: "calc(50px + env(safe-area-inset-top))",
          bottom: 0,
        }}
      >
        {/* 上半分：カード表示（アコーディオン） */}
        <motion.div
          className="overflow-hidden flex-shrink-0"
          animate={{ height: isTopCollapsed ? 0 : "45vh" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {(reading.cards?.length ?? 0) > 0 && <UpperViewer />}
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

        {/* 下半分：メッセージ一覧 */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-white px-4 py-6 space-y-6 pb-26">
          {messages.map((message, index) => {
            const textContent = message.parts
              .filter((part) => part.type === "text")
              .map((part) => (part as { text: string }).text)
              .join("");

            return (
              <div key={index}>
                {message.role === "user" ? (
                  <div className="bg-gray-100 rounded-3xl px-4 py-3 inline-block max-w-[85%]">
                    <p className="text-base text-gray-900 whitespace-pre-wrap">
                      {textContent}
                    </p>
                  </div>
                ) : (
                  <MessageContent content={textContent} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReadingHistoryPage;
