import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  DrawnCard,
  MasterData,
  Plan,
  ReadingCategory,
  Spread,
} from "../../../shared/lib/types";
import { useSalon } from "../lib/hooks/use-salon";
import { drawRandomCards } from "../lib/utils/salon";
import type { UserPlan } from "../types";
import CategorySpreadSelector from "./category-spread-selector";
import { MessageContent } from "./message-content";
import ShuffleDialog from "./shuffle-dialog";
import UpperViewer from "./upper-viewer";

// ─────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────

const CLARA_DISCLAIMER =
  "📖 Clara より：それぞれのカードの意味をお伝えしました！本当はカード同士の関係も読めると良いのですが、まだ勉強中で…💦 各カードのメッセージを組み合わせた総合的な解釈は、あなたの直感に委ねます。きっと答えはあなたの中にあります 🌟";

const CATEGORY_TO_MEANING_KEY: Record<string, string> = {
  恋愛: "love",
  仕事: "career",
  健康: "health",
  金運: "money",
};

// ─────────────────────────────────────────────
// カード meanings からメッセージ文字列を生成
// ─────────────────────────────────────────────

function buildClaraMessages(
  drawnCards: DrawnCard[],
  categoryName: string,
): string[] {
  const meaningKey = CATEGORY_TO_MEANING_KEY[categoryName] ?? "love";

  const cardMessages = drawnCards.map((dc) => {
    const card = dc.card!;
    const meaning =
      card.meanings?.find((m) => m.category === meaningKey) ??
      card.meanings?.[0];
    const orientation = dc.isReversed ? "逆位置" : "正位置";
    const text = dc.isReversed ? meaning?.reversed : meaning?.upright;
    const fallback = (
      dc.isReversed ? card.reversedKeywords : card.uprightKeywords
    )?.join("、");

    return `**${dc.position}（${orientation}）: ${card.name}**\n\n${text ?? fallback ?? ""}`;
  });

  return [...cardMessages, CLARA_DISCLAIMER];
}

// ─────────────────────────────────────────────
// ClaraPanel – ChatPanel の代わり（API呼び出しなし）
// ─────────────────────────────────────────────

interface ClaraPanelProps {
  messages: string[];
  onBack: () => void;
  category?: ReadingCategory | null;
  spread?: Spread | null;
}

const ClaraPanel: React.FC<ClaraPanelProps> = ({
  messages,
  onBack,
  category,
  spread,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* メッセージエリア */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white px-4 py-4 space-y-6 pb-24">
        {/* カテゴリ・スプレッド情報 */}
        {(category || spread) && (
          <div className="space-y-2">
            {/* 占い内容バッジ */}
            {category && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">
                  占い内容
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                  {category.name}
                </span>
              </div>
            )}
            {/* スプレッド情報カード */}
            {spread && (
              <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs text-purple-500 font-medium">
                    🃏 スプレッド
                  </span>
                  <span className="text-xs font-bold text-purple-800">
                    {spread.name}
                  </span>
                </div>
                {spread.guide && (
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {spread.guide}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        {messages.map((text, i) => (
          <div key={i}>
            <MessageContent content={text} />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 戻るボタン */}
      <motion.button
        initial={{ opacity: 0, scale: 0.7, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.3 }}
        className="absolute bottom-6 right-6 z-50 bg-white/20 shadow-xl rounded-full px-5 py-3 text-purple-600 font-bold flex items-center gap-2"
        onClick={onBack}
      >
        <span>← 戻る</span>
      </motion.button>
    </div>
  );
};

// ─────────────────────────────────────────────
// ClaraPage
// ─────────────────────────────────────────────

interface ClaraPageProps {
  masterData: MasterData;
  currentPlan: Plan;
  onChangePlan: (plan: UserPlan) => void;
  onBack: () => void;
}

const ClaraPage: React.FC<ClaraPageProps> = ({
  masterData,
  currentPlan,
  onChangePlan,
}) => {
  const {
    selectedSpread,
    selectedCategory,
    drawnCards,
    setDrawnCards,
    setIsRevealingCompleted,
  } = useSalon();

  // Clara は masterData から直接取得（ストアの selectedTarotist は変更しない）
  const clara = masterData.tarotists?.find((t) => t.provider === "OFFLINE");

  const [phase, setPhase] = useState<"select" | "reading">("select");
  const [claraMessages, setClaraMessages] = useState<string[]>([]);
  const [isTopCollapsed, setIsTopCollapsed] = useState(false);

  // phase が "reading" になったらカードを引く（ReadingPage と同じパターン）
  // → drawnCards.length === 0 の間 ShuffleDialog が表示される
  useEffect(() => {
    if (phase !== "reading") return;
    if (!selectedSpread || !selectedCategory) return;

    const drawn = drawRandomCards(masterData, selectedSpread);
    setDrawnCards(drawn);
    setIsRevealingCompleted(true); // 全カードを最初からめくれた状態に
    setClaraMessages(buildClaraMessages(drawn, selectedCategory.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 「占いを始める」ボタン → reading フェーズへ
  const handleStartReading = () => {
    setDrawnCards([]); // 念のためリセット（ShuffleDialog を確実に開く）
    setPhase("reading");
  };

  // 戻る → select フェーズに戻す
  const handleReset = () => {
    setDrawnCards([]);
    setIsRevealingCompleted(false);
    setClaraMessages([]);
    setPhase("select");
  };

  // ──────────────────────────────────────────
  // フェーズ: 選択（SalonPage と同じレイアウト）
  // ──────────────────────────────────────────
  if (phase === "select") {
    return (
      <div className="main-container">
        {/* 上下統合ラッパー */}
        <div
          className="fixed left-0 right-0 flex flex-col"
          style={{
            top: "calc(50px + env(safe-area-inset-top))",
            bottom: 0,
          }}
        >
          {/* 上半分: Clara 肖像（アコーディオン） */}
          <motion.div
            className="overflow-hidden flex-shrink-0"
            animate={{ height: isTopCollapsed ? 0 : "45vh" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="h-full p-2">
              <div className="h-full rounded-3xl overflow-hidden shadow-xl">
                <img
                  src={`/tarotists/${clara?.name ?? "Clara"}.png`}
                  alt={clara?.title ?? "Clara"}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: "center 20%" }}
                />
              </div>
            </div>
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

          {/* 下半分: カテゴリ・スプレッド選択 */}
          <div className="flex-1 min-h-0 px-1 flex flex-col">
            <div className="flex-1 overflow-y-auto pb-52">
              <CategorySpreadSelector
                handleStartReading={handleStartReading}
                claraMode={true}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────
  // フェーズ: 占い（ReadingPage と同じレイアウト）
  // ──────────────────────────────────────────
  return (
    <div className="main-container">
      {/* シャッフルダイアログ: drawnCards が引かれるまで表示（ReadingPage と同じ制御） */}
      <ShuffleDialog isOpen={drawnCards.length === 0} onComplete={() => {}} />

      {/* 上下統合ラッパー */}
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
          {drawnCards.length > 0 && <UpperViewer claraMode={true} />}
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

        {/* 下半分: ClaraPanel */}
        <div className="flex-1 min-h-0">
          {drawnCards.length > 0 && (
            <ClaraPanel
              messages={claraMessages}
              onBack={handleReset}
              category={selectedCategory}
              spread={selectedSpread}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaraPage;
