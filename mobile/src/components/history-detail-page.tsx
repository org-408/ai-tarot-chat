import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ChatMessage, Reading, TarotCard } from "../../../shared/lib/types";
import { useMaster } from "../lib/hooks/use-master";
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

  // 履歴データは保存時点の言語版。UI 現在言語に引き直す。
  const { spreadById, categoryById, decks } = useMaster();
  const resolvedCategory = reading.categoryId
    ? categoryById.get(reading.categoryId) ?? reading.category ?? null
    : reading.category ?? null;
  const resolvedSpread = reading.spreadId
    ? spreadById.get(reading.spreadId) ?? reading.spread ?? null
    : reading.spread ?? null;

  // TarotCard は @@unique([code, language]) で言語ごとに別レコード。
  // DrawnCard.cardId は保存時言語の id を指すため、現在言語の row に引き直すには
  // code (言語非依存) をキーにする。useMaster().decks は現在言語でフィルタ済み。
  const cardByCode = useMemo(
    () =>
      new Map(
        decks.flatMap((d) => d.cards ?? []).map((c) => [c.code, c]),
      ),
    [decks],
  );

  // salon ストアに読み込みデータをセット（ClaraPage と同じパターン）
  // DrawnCard.position / description / card は保存時点の言語版なので、
  // resolvedSpread.cells と現在言語 deck から引き直して上書きする。
  useEffect(() => {
    const cellByOrder = new Map(
      (resolvedSpread?.cells ?? []).map((c) => [c.order, c]),
    );
    const cards = (reading.cards ?? []).map((dc) => {
      const cell = cellByOrder.get(dc.order);
      const saved = dc.card ?? cardMap.get(dc.cardId);
      const resolvedCard = saved?.code
        ? cardByCode.get(saved.code) ?? saved
        : saved;
      return {
        ...dc,
        card: resolvedCard,
        position: cell?.position ?? dc.position,
        description: cell?.description ?? dc.description,
      };
    });
    setDrawnCards(cards);
    setIsRevealingCompleted(true);
    setUpperViewerMode("profile");

    return () => {
      setDrawnCards([]);
      setIsRevealingCompleted(false);
      setUpperViewerMode("grid");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading.id, resolvedSpread, cardByCode]);

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
            <UpperViewer
              profileTarotistName={tarotistName}
              spread={resolvedSpread ?? reading.spread!}
            />
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
            category={resolvedCategory}
            spread={resolvedSpread}
            customQuestion={reading.customQuestion ?? null}
            createdAt={reading.createdAt}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default HistoryDetailPage;
