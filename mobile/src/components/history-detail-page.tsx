import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { ChatMessage, Reading, TarotCard } from "../../../shared/lib/types";
import { useSalon } from "../lib/hooks/use-salon";
import { HistoryPanel } from "./history-panel";
import UpperViewer from "./upper-viewer";

interface HistoryDetailPageProps {
  reading: Reading;
  cardMap: Map<string, TarotCard>;
  onClose: () => void;
}

const HistoryDetailPage: React.FC<HistoryDetailPageProps> = ({ reading, cardMap, onClose }) => {
  const {
    drawnCards,
    setDrawnCards,
    isRevealingCompleted,
    setIsRevealingCompleted,
    setUpperViewerMode,
  } = useSalon();

  const [isTopCollapsed, setIsTopCollapsed] = useState(false);

  // ClaraPage と同じパターン: UpperViewer のマウント時 "grid" リセットを親 effect で上書き
  useEffect(() => {
    if (isRevealingCompleted) {
      setUpperViewerMode("profile");
    }
  }, [isRevealingCompleted, setUpperViewerMode]);

  const tarotistName = reading.tarotist?.name ?? "Clara";
  const messages: ChatMessage[] = reading.chatMessages ?? [];

  // salon ストアに読み込みデータをセット（ClaraPage と同じパターン）
  useEffect(() => {
    const cards = (reading.cards ?? []).map((dc) => ({
      ...dc,
      card: dc.card ?? cardMap.get(dc.cardId),
    }));
    setDrawnCards(cards);
    setIsRevealingCompleted(true);
    setUpperViewerMode("profile");

    return () => {
      setDrawnCards([]);
      setIsRevealingCompleted(false);
      setUpperViewerMode("grid");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading.id]);

  return (
    <div className="main-container">
      <div
        className="fixed left-0 right-0 flex flex-col"
        style={{
          top: "calc(50px + env(safe-area-inset-top))",
          bottom: 0,
        }}
      >
        {/* 上半分: UpperViewer（アコーディオン） */}
        <motion.div
          className="overflow-hidden flex-shrink-0"
          animate={{ height: isTopCollapsed ? 0 : "45vh" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {drawnCards.length > 0 && (
            <UpperViewer profileTarotistName={tarotistName} spread={reading.spread!} />
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

        {/* 下半分: HistoryPanel */}
        <div className="flex-1 min-h-0">
          <HistoryPanel
            messages={messages}
            category={reading.category ?? null}
            spread={reading.spread ?? null}
            customQuestion={reading.customQuestion ?? null}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default HistoryDetailPage;
