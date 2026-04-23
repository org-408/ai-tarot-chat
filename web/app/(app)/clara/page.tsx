"use client";

import { ShuffleDialog } from "@shared/components/reading/shuffle-dialog";
import { ChatColumn } from "@/components/reading/chat-column";
import { SelectionView } from "@/components/reading/selection-view";
import { SpreadRevealColumn } from "@/components/reading/spread-reveal-column";
import { TwoColumnReadingLayout } from "@/components/reading/two-column-reading-layout";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useSalonStore } from "@/lib/client/stores/salon-store";
import { drawRandomCards } from "@/lib/client/services/draw-service";
import type {
  DrawnCard,
  MasterData,
  Plan,
  ReadingCategory,
  Spread,
  Tarotist,
} from "@shared/lib/types";
import type { UIMessage } from "ai";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

type Phase = "selection" | "reading";

// mobile/src/components/clara-page.tsx と同一のマッピング
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

function buildUIMessages(texts: string[]): UIMessage[] {
  return texts.map((text, i) => ({
    id: `clara-${i}`,
    role: "assistant" as const,
    parts: [{ type: "text", text }],
  }));
}

// ─────────────────────────────────────────────────────────────
// ClaraReadingView — reading phase 丸ごと分離（key で強制リマウント）
// ─────────────────────────────────────────────────────────────

interface ClaraReadingViewProps {
  tarotist: Tarotist;
  spread: Spread;
  category: ReadingCategory;
  masterData: MasterData;
  onReadAgain: () => void;
  onHeaderBack: () => void;
  labels: {
    backToHome: string;
    readAgain: string;
    lockedDuringReading: string;
    showSpread: string;
    hideSpread: string;
    revealAll: string;
    revealPrompt: string;
    allRevealed: string;
  };
}

function ClaraReadingView({
  tarotist,
  spread,
  category,
  masterData,
  onReadAgain,
  onHeaderBack,
  labels,
}: ClaraReadingViewProps) {
  const {
    drawnCards,
    isRevealingCompleted,
    isLocked,
    setDrawnCards,
    setIsRevealingCompleted,
    setIsLocked,
  } = useSalonStore();

  const [isShuffleDone, setIsShuffleDone] = useState(false);
  const [rightVisible, setRightVisible] = useState(true);
  const hasDrawnRef = useRef(false);

  // カード抽出（一度だけ）— オフラインなので最初から全てめくれた状態にする
  useEffect(() => {
    if (hasDrawnRef.current) return;
    hasDrawnRef.current = true;
    const cards = drawRandomCards(masterData, spread);
    setDrawnCards(cards);
    setIsRevealingCompleted(true);
  }, [masterData, spread, setDrawnCards, setIsRevealingCompleted]);

  // Clara メッセージは drawnCards が揃ったら同期的に生成
  const claraMessages = useMemo<UIMessage[]>(() => {
    if (drawnCards.length === 0) return [];
    return buildUIMessages(
      buildClaraMessages(drawnCards, category.name, spread.name),
    );
  }, [drawnCards, category.name, spread.name]);

  const tarotistImageUrl = `/tarotists/${tarotist.name}.png`;

  return (
    <>
      <ShuffleDialog
        isOpen={!isShuffleDone && drawnCards.length === 0}
        onComplete={() => setIsShuffleDone(true)}
        cardBackPath="/cards/back.png"
      />

      <TwoColumnReadingLayout
        isLocked={isLocked}
        onHeaderBack={onHeaderBack}
        backLabel={labels.backToHome}
        lockedLabel={labels.lockedDuringReading}
        rightVisible={rightVisible}
        onToggleRight={() => setRightVisible((v) => !v)}
        showSpreadLabel={labels.showSpread}
        hideSpreadLabel={labels.hideSpread}
        left={
          drawnCards.length > 0 ? (
            <div className="relative h-full">
              <ChatColumn
                tarotistImageUrl={tarotistImageUrl}
                tarotistName={tarotist.name}
                tarotistIcon={tarotist.icon}
                tarotistTitle={tarotist.title}
                tarotistTrait={tarotist.trait}
                messages={claraMessages}
                status="idle"
                inputValue=""
                onInputChange={() => {}}
                onSend={() => {}}
                onKeyDown={() => {}}
                inputDisabled={true}
                isMessageComplete={true}
                error={null}
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center z-40 pointer-events-none">
                <button
                  type="button"
                  onClick={() => {
                    setIsLocked(false);
                    onReadAgain();
                  }}
                  className="pointer-events-auto flex items-center gap-2 px-5 py-3 bg-white shadow-xl rounded-full text-sm font-bold text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <RefreshCw size={14} />
                  {labels.readAgain}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full" />
          )
        }
        right={
          isShuffleDone && drawnCards.length > 0 ? (
            <SpreadRevealColumn
              spread={spread}
              drawnCards={drawnCards}
              isRevealingCompleted={isRevealingCompleted}
              onRevealAll={() => setIsRevealingCompleted(true)}
              onRevealingCompleted={() => setIsRevealingCompleted(true)}
              revealAllLabel={labels.revealAll}
              revealPromptLabel={labels.revealPrompt}
              allRevealedLabel={labels.allRevealed}
            />
          ) : undefined
        }
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// ClaraPage
// ─────────────────────────────────────────────────────────────

export default function ClaraPage() {
  const t = useTranslations("clara");
  const tSalon = useTranslations("salon");
  const tCommon = useTranslations("common");
  const tReading = useTranslations("reading");

  const {
    data: masterData,
    init: initMaster,
    tarotists,
    categories,
    spreads,
    isLoading,
  } = useMasterStore();
  const {
    quickSpread: selectedSpread,
    quickCategory: selectedCategory,
    setQuickSpread,
    setQuickCategory,
    setIsLocked,
    resetSession,
  } = useSalonStore();
  const { refreshUsage, usage } = useClientStore();

  const [phase, setPhase] = useState<Phase>("selection");
  const [readingKey, setReadingKey] = useState(0);

  useEffect(() => {
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage]);

  useEffect(() => {
    return () => setIsLocked(false);
  }, [setIsLocked]);

  // Clara タロティストを OFFLINE provider で検索（マスターから固定取得）
  const clara = useMemo(
    () => tarotists.find((tt) => tt.provider === "OFFLINE") ?? null,
    [tarotists],
  );

  const handleStartReading = ({
    category,
    spread,
  }: {
    category: ReadingCategory | null;
    spread: Spread;
  }) => {
    setQuickSpread(spread);
    setQuickCategory(category);
    resetSession();
    setIsLocked(true);
    setPhase("reading");
  };

  const handleReadAgain = () => {
    resetSession();
    setIsLocked(false);
    setReadingKey((k) => k + 1);
    setPhase("selection");
  };

  const handleHeaderBack = () => {
    resetSession();
    setIsLocked(false);
  };

  const currentPlan = (usage?.plan as Plan | undefined) ?? null;

  // ─── Phase: reading ─────────────────────────────────────────
  if (
    phase === "reading" &&
    clara &&
    selectedSpread &&
    selectedCategory &&
    masterData
  ) {
    return (
      <ClaraReadingView
        key={readingKey}
        tarotist={clara}
        spread={selectedSpread}
        category={selectedCategory}
        masterData={masterData}
        onReadAgain={handleReadAgain}
        onHeaderBack={handleHeaderBack}
        labels={{
          backToHome: tCommon("backToHome"),
          readAgain: t("readAgain"),
          lockedDuringReading: tCommon("lockedDuringReading"),
          showSpread: tReading("showSpread"),
          hideSpread: tReading("hideSpread"),
          revealAll: tReading("revealAll"),
          revealPrompt: tReading("revealPrompt"),
          allRevealed: tReading("allRevealed"),
        }}
      />
    );
  }

  // ─── Phase: selection ───────────────────────────────────────
  // クイック占いと同じ 2 カラム（タロティスト + カテゴリ/スプレッド）。
  // ただしタロティストは Clara 1 人だけ・最初から portrait で固定。
  return (
    <SelectionView
      isPersonal={false}
      tarotists={clara ? [clara] : []}
      selectedTarotist={clara}
      onSelectTarotist={() => {
        /* Clara 固定のため no-op */
      }}
      currentPlan={currentPlan}
      categories={categories}
      spreads={spreads}
      selectedCategory={selectedCategory}
      selectedSpread={selectedSpread}
      isLoading={isLoading || !clara}
      onQuickStartReading={handleStartReading}
      tarotistMode="portrait"
      title={t("title")}
      subtitle={t("desc")}
      backLabel={tCommon("backToHome")}
      quickLabels={{
        selectCategoryAndSpreadPrompt: tSalon("selectCategoryAndSpread"),
        categoryLabel: tSalon("categoryLabel"),
        spreadLabel: tSalon("spreadLabel"),
        selectPlaceholder: tSalon("selectPlaceholder"),
        categoryQuestion: tSalon("categoryQuestion"),
        spreadQuestion: tSalon("spreadQuestion"),
        spreadSubtitle: tSalon("spreadSubtitle"),
        startReading: t("startReading"),
        limitReached: tSalon("limitReached"),
        disabledMessage: tSalon("selectTarotistFirst"),
      }}
    />
  );
}
