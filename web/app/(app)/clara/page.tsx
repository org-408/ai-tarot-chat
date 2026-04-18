"use client";

import { CategorySpreadSelector } from "@shared/components/reading/category-spread-selector";
import { MessageContent } from "@shared/components/chat/message-content";
import { ShuffleDialog } from "@shared/components/reading/shuffle-dialog";
import { UpperViewer, type UpperViewerTab } from "@shared/components/tarot/upper-viewer";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { drawRandomCards } from "@/lib/client/services/draw-service";
import type { DrawnCard, ReadingCategory, Spread } from "@shared/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, RefreshCw } from "lucide-react";

type Phase = "selection" | "reading";

const SPREAD_VIEW_DISPLAY_MS = 2000;

// mobile/src/components/clara-page.tsx:28-34 と同一のマッピング
const CATEGORY_TO_MEANING_KEY: Record<string, string> = {
  恋愛: "love",
  仕事: "career",
  健康: "health",
  金運: "money",
};

const CLARA_DISCLAIMER =
  "📖 それぞれのカードの意味をお伝えしました！\n本当はカード同士の関係も読めると良いのですが、まだ勉強中で…💦\n各カードのメッセージを組み合わせた総合的な解釈は、あなたの直感に委ねます。\nきっと答えはあなたの中にあります 🌟";

function buildClaraMessages(
  drawnCards: DrawnCard[],
  categoryName: string,
  spreadName: string,
): string[] {
  const meaningKey = CATEGORY_TO_MEANING_KEY[categoryName] ?? "love";

  const intro =
    `こんにちは、Claraです。\n` +
    `今回は「${categoryName}」について、スプレッド「${spreadName}」でカードを読み解いていきますね。\n` +
    `それぞれの位置がどんな意味を持つのかもあわせて、1枚ずつ丁寧に見ていきましょう。`;

  const cards = drawnCards.map((dc) => {
    const card = dc.card!;
    const meaning =
      card.meanings?.find((m) => m.category === meaningKey) ??
      card.meanings?.[0];
    const orientation = dc.isReversed ? "逆位置" : "正位置";
    const text = dc.isReversed ? meaning?.reversed : meaning?.upright;
    const fallback = (
      dc.isReversed ? card.reversedKeywords : card.uprightKeywords
    )?.join("、");
    return `**${dc.position}（${orientation}）: ${card.name}**\n\nこのカードの位置は${dc.position}を示しています。\n\n${text ?? fallback ?? ""}`;
  });

  return [intro, ...cards, CLARA_DISCLAIMER];
}

export default function ClaraPage() {
  const t = useTranslations("clara");
  const tSalon = useTranslations("salon");
  const tCommon = useTranslations("common");

  const { data: masterData, init: initMaster, categories, spreads, isLoading, tarotists } =
    useMasterStore();
  const { refreshUsage, usage } = useClientStore();

  const [phase, setPhase] = useState<Phase>("selection");
  const [selectedCategory, setSelectedCategory] =
    useState<ReadingCategory | null>(null);
  const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isRevealingCompleted, setIsRevealingCompleted] = useState(false);
  const [upperTab, setUpperTab] = useState<UpperViewerTab>("grid");
  const [isTopCollapsed, setIsTopCollapsed] = useState(false);

  useEffect(() => {
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage]);

  // Clara タロティストをマスターデータから OFFLINE provider で検索
  const clara = useMemo(
    () => tarotists.find((tt) => tt.provider === "OFFLINE"),
    [tarotists],
  );
  const claraImageUrl = clara
    ? `/tarotists/${clara.name}.png`
    : "/tarotists/Clara.png";

  // リーディング開始
  const handleStartReading = ({
    category,
    spread,
  }: {
    category: ReadingCategory | null;
    spread: Spread;
  }) => {
    setSelectedCategory(category);
    setSelectedSpread(spread);
    setDrawnCards([]);
    setIsRevealingCompleted(false);
    setUpperTab("grid");
    setIsShuffling(true);
  };

  const handleShuffleComplete = () => {
    setIsShuffling(false);
    if (!masterData || !selectedSpread) return;
    const cards = drawRandomCards(masterData, selectedSpread);
    setDrawnCards(cards);
    // Clara はオフラインなので全カードを最初から開けた状態にする
    setIsRevealingCompleted(true);
    setPhase("reading");
  };

  // 全カードめくり完了 → SPREAD_VIEW_DISPLAY_MS 後にプロフィールへ
  useEffect(() => {
    if (phase !== "reading" || !isRevealingCompleted) return;
    const timer = setTimeout(
      () => setUpperTab("profile"),
      SPREAD_VIEW_DISPLAY_MS,
    );
    return () => clearTimeout(timer);
  }, [phase, isRevealingCompleted]);

  const handleReadAgain = () => {
    setPhase("selection");
    setSelectedSpread(null);
    setDrawnCards([]);
    setIsRevealingCompleted(false);
    setUpperTab("grid");
  };

  const currentPlan = usage?.plan as Parameters<
    typeof CategorySpreadSelector
  >[0]["currentPlan"];

  // Clara メッセージを生成
  const claraMessages = useMemo(() => {
    if (phase !== "reading") return [];
    if (drawnCards.length === 0 || !selectedSpread || !selectedCategory) return [];
    return buildClaraMessages(
      drawnCards,
      selectedCategory.name,
      selectedSpread.name,
    );
  }, [phase, drawnCards, selectedCategory, selectedSpread]);

  // ═════════════════════════════════════════════════════════════
  // Phase 1: カテゴリー・スプレッド選択
  // ═════════════════════════════════════════════════════════════
  if (phase === "selection") {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <ArrowLeft size={16} />
            {tCommon("backToHome")}
          </Link>
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-800">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("desc")}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-300 border-t-indigo-600 animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border p-4">
            <CategorySpreadSelector
              categories={categories}
              spreads={spreads}
              currentPlan={currentPlan}
              isPersonal={false}
              remainingCount={undefined}
              disabled={false}
              onStartReading={handleStartReading}
              labels={{
                selectSpreadPrompt: tSalon("selectSpread"),
                selectCategoryAndSpreadPrompt: tSalon(
                  "selectCategoryAndSpread",
                ),
                categoryLabel: tSalon("categoryLabel"),
                spreadLabel: tSalon("spreadLabel"),
                selectPlaceholder: tSalon("selectPlaceholder"),
                categoryQuestion: tSalon("categoryQuestion"),
                spreadQuestion: tSalon("spreadQuestion"),
                spreadSubtitle: tSalon("spreadSubtitle"),
                startReading: t("startReading"),
                limitReached: tSalon("limitReached"),
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // Phase 2: オフラインリーディング (UpperViewer + Clara メッセージ)
  // ═════════════════════════════════════════════════════════════
  return (
    <>
      <ShuffleDialog
        isOpen={isShuffling}
        onComplete={handleShuffleComplete}
        cardBackPath="/cards/back.png"
      />

      <div className="flex flex-col h-[100dvh] -m-4 md:-m-6">
        {/* ヘッダー */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-indigo-100">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <ArrowLeft size={16} />
            {tCommon("backToHome")}
          </Link>
          <span className="text-xs text-indigo-600 font-medium">
            {t("phase2Title")}
          </span>
        </div>

        {/* 上半分: UpperViewer */}
        <motion.div
          className="flex-shrink-0 overflow-hidden"
          animate={{ height: isTopCollapsed ? 0 : "40vh" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {drawnCards.length > 0 && selectedSpread && (
            <UpperViewer
              spread={selectedSpread}
              drawnCards={drawnCards}
              isRevealingCompleted={isRevealingCompleted}
              onRevealingCompleted={() => setIsRevealingCompleted(true)}
              tarotistImageUrl={claraImageUrl}
              tarotistName={clara?.name ?? "Clara"}
              cardBasePath="/cards"
              activeTab={upperTab}
              onActiveTabChange={setUpperTab}
            />
          )}
        </motion.div>

        {/* アコーディオントグル */}
        <button
          type="button"
          onClick={() => setIsTopCollapsed((v) => !v)}
          className="flex-shrink-0 w-full h-7 flex items-center justify-center bg-white z-30"
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

        {/* 下半分: Clara メッセージ */}
        <div className="flex-1 overflow-hidden relative">
          <div className="w-full h-full flex flex-col bg-white">
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-6 pb-24">
              {/* カテゴリ・スプレッド情報 */}
              {(selectedCategory || selectedSpread) && (
                <div className="space-y-2">
                  {selectedCategory && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-medium">
                        {t("categoryLabel")}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        {selectedCategory.name}
                      </span>
                    </div>
                  )}
                  {selectedSpread && (
                    <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs text-purple-500 font-medium">
                          🃏 {t("spreadLabel")}
                        </span>
                        <span className="text-xs font-bold text-purple-800">
                          {selectedSpread.name}
                        </span>
                      </div>
                      {selectedSpread.guide && (
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {selectedSpread.guide}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {claraMessages.map((text, i) => (
                <MessageContent key={i} content={text} />
              ))}
            </div>

            {/* もう一度占うボタン */}
            <AnimatePresence>
              <motion.button
                key="read-again"
                initial={{ opacity: 0, scale: 0.7, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  delay: 0.3,
                }}
                className="absolute bottom-6 right-6 z-50 bg-white shadow-xl rounded-full px-5 py-3 text-indigo-600 font-bold flex items-center gap-2 hover:bg-indigo-50 transition-colors"
                onClick={handleReadAgain}
              >
                <RefreshCw size={14} />
                {t("readAgain")}
              </motion.button>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
