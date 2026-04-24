import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  DrawnCard,
  MasterData,
  Plan,
  ReadingCategory,
  Spread,
} from "../../../shared/lib/types";
import i18n from "../i18n";
import { useMaster } from "../lib/hooks/use-master";
import { useSalon } from "../lib/hooks/use-salon";
import { drawRandomCards } from "../lib/utils/salon";
import CategorySpreadSelector from "./category-spread-selector";
import { MessageContent } from "./message-content";
import ShuffleDialog from "./shuffle-dialog";
import UpperViewer from "./upper-viewer";

// ─────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────

/** スプレッドビューを表示してからプロフィールへ切り替えるまでの時間 (ms) */
const SPREAD_VIEW_DISPLAY_MS = 2000;

// ReadingCategory.no → meaning キー変換テーブル (言語非依存)
// 1: 恋愛 (Love), 2: 仕事 (Work), 5: 健康 (Wellness), 6: 金運 (Money)
const CATEGORY_NO_TO_MEANING_KEY: Record<number, string> = {
  1: "love",
  2: "career",
  5: "health",
  6: "money",
};

// ─────────────────────────────────────────────
// カード meanings からメッセージ文字列を生成
// ─────────────────────────────────────────────

function buildClaraMessages(
  drawnCards: DrawnCard[],
  category: ReadingCategory,
  spread: Spread,
): string[] {
  const meaningKey = CATEGORY_NO_TO_MEANING_KEY[category.no] ?? "love";

  const introMessage = i18n.t("clara.intro", {
    category: category.name,
    spread: spread.name,
  });

  const cardMessages = drawnCards.map((dc) => {
    const card = dc.card!;
    const meaning =
      card.meanings?.find((m) => m.category === meaningKey) ??
      card.meanings?.[0];
    const orientation = dc.isReversed
      ? i18n.t("reading.reversed")
      : i18n.t("reading.upright");
    const text = dc.isReversed ? meaning?.reversed : meaning?.upright;
    const fallback = (
      dc.isReversed ? card.reversedKeywords : card.uprightKeywords
    )?.join(i18n.t("common.listSeparator"));

    return i18n.t("clara.cardEntry", {
      position: dc.position,
      orientation,
      name: card.name,
      text: text ?? fallback ?? "",
    });
  });

  return [introMessage, ...cardMessages, i18n.t("clara.disclaimer")];
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
  const { t } = useTranslation();
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
                  {t("reading.readingContent")}
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
                    {t("reading.spreadLabel")}
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
        <span>{t("chat.tryAgain")}</span>
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
  onBack: () => void;
}

const ClaraPage: React.FC<ClaraPageProps> = ({
  masterData,
  currentPlan: _currentPlan,
}) => {
  const {
    quickSpread,
    quickCategory,
    drawnCards,
    setDrawnCards,
    setIsRevealingCompleted,
    isRevealingCompleted,
    setUpperViewerMode,
  } = useSalon();

  // Clara は masterData から直接取得（ストアの selectedTarotist は変更しない）
  // 現在言語に解決された tarotists / categories / spreads を取得
  const {
    tarotists: resolvedTarotists,
    categories: resolvedCategories,
    spreads: resolvedSpreads,
  } = useMaster();
  const clara = resolvedTarotists?.find((t) => t.provider === "OFFLINE");

  const [phase, setPhase] = useState<"select" | "reading">("select");
  const [claraMessages, setClaraMessages] = useState<string[]>([]);
  const [isTopCollapsed, setIsTopCollapsed] = useState(false);

  // phase が "reading" になったらカードを引く（ReadingPage と同じパターン）
  // → drawnCards.length === 0 の間 ShuffleDialog が表示される
  useEffect(() => {
    if (phase !== "reading") return;
    if (!quickSpread || !quickCategory) return;

    // 現在言語に解決済みの category/spread を使う (salon store の quick* は
    // 初期化時点の言語版で、lang 切替後も更新されないため)
    const resolvedCategory =
      resolvedCategories.find((c) => c.id === quickCategory.id) ?? quickCategory;
    const resolvedSpread =
      resolvedSpreads.find((s) => s.id === quickSpread.id) ?? quickSpread;
    const drawn = drawRandomCards(masterData, resolvedSpread);
    setDrawnCards(drawn);
    setIsRevealingCompleted(true); // 全カードを最初からめくれた状態に
    setClaraMessages(
      buildClaraMessages(drawn, resolvedCategory, resolvedSpread),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // カード表示完了後、スプレッドビューを少し見せてから上段をプロフィール表示へ戻す
  useEffect(() => {
    if (isRevealingCompleted) {
      const t = setTimeout(
        () => setUpperViewerMode("profile"),
        SPREAD_VIEW_DISPLAY_MS,
      );
      return () => clearTimeout(t);
    }
  }, [isRevealingCompleted, setUpperViewerMode]);

  // 「リーディングを始める」ボタン → reading フェーズへ
  const handleStartReading = () => {
    setDrawnCards([]); // 念のためリセット（ShuffleDialog を確実に開く）
    setPhase("reading");
  };

  // 戻る → select フェーズに戻す
  const handleReset = () => {
    setDrawnCards([]);
    setIsRevealingCompleted(false);
    setUpperViewerMode("grid");
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
          {drawnCards.length > 0 && (
            <UpperViewer claraMode={true} spread={quickSpread} />
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

        {/* 下半分: ClaraPanel */}
        <div className="flex-1 min-h-0">
          {drawnCards.length > 0 && (
            <ClaraPanel
              messages={claraMessages}
              onBack={handleReset}
              category={quickCategory}
              spread={quickSpread}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaraPage;
