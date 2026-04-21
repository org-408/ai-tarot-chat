"use client";

import { CategorySpreadSelector } from "@shared/components/reading/category-spread-selector";
import { ChatView } from "@shared/components/chat/chat-view";
import { ShuffleDialog } from "@shared/components/reading/shuffle-dialog";
import { UpperViewer, type UpperViewerTab } from "@shared/components/tarot/upper-viewer";
import { TarotistCarouselPortrait } from "@/components/reading/tarotist-carousel-portrait";
import { useChatSession } from "@shared/hooks/use-chat-session";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useSalonStore } from "@/lib/client/stores/salon-store";
import { drawRandomCards } from "@/lib/client/services/draw-service";
import type { UIMessage } from "@ai-sdk/react";
import type {
  DrawnCard,
  MasterData,
  Plan,
  ReadingCategory,
  Spread,
  Tarotist,
} from "@shared/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Lock, RefreshCw } from "lucide-react";

type Phase = "tarotist" | "chat" | "reading";

const SPREAD_VIEW_DISPLAY_MS = 2000;

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const onResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      setHeight(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    };
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
    };
  }, []);
  return height;
}

// ═════════════════════════════════════════════════════════════
// PersonalPhase1View — 対話フェーズ
//
// Phase1 は「挨拶 → 占いたいこと入力 → AI のスプレッド推薦」を対話で進める。
// AI がスプレッド推薦に至ると phase1Stage === "spread-selection" になり、
// ChatView の footer に CategorySpreadSelector を inline 表示する
// （モバイル chat-panel.tsx:626-631 と同じ方式。オーバーレイは使わない）。
// ═════════════════════════════════════════════════════════════

interface PersonalPhase1ViewProps {
  tarotist: Tarotist;
  masterData: MasterData | null;
  token: string;
  remainingPersonal: number | undefined;
  currentPlan: Plan | null;
  categories: ReadingCategory[];
  spreads: Spread[];
  onMessagesChange: (messages: UIMessage[]) => void;
  onSpreadSuggested: (spread: Spread) => void;
  onConfirmSpread: (args: { category: ReadingCategory | null; spread: Spread }) => void;
  onHeaderBack: () => void;
  onRefreshUsage: () => Promise<void>;
  onRefreshToken: () => Promise<string | null>;
  labels: {
    backToHome: string;
    remainingPersonal: string;
    phase1Title: string;
    confirmSpreadPrompt: string;
    spreadLabel: string;
    selectPlaceholder: string;
    spreadQuestion: string;
    spreadSubtitle: string;
    startReading: string;
    limitReached: string;
  };
}

function PersonalPhase1View({
  tarotist,
  masterData,
  token,
  remainingPersonal,
  currentPlan,
  categories,
  spreads,
  onMessagesChange,
  onSpreadSuggested,
  onConfirmSpread,
  onHeaderBack,
  onRefreshUsage,
  onRefreshToken,
  labels,
}: PersonalPhase1ViewProps) {
  const keyboardHeight = useKeyboardHeight();
  const [isTopCollapsed, setIsTopCollapsed] = useState(false);

  const phase1Session = useChatSession(
    {
      api: "/api/readings/personal",
      token,
      isPersonal: true,
      isPhase2: false,
      tarotist,
      // Phase1 ではスプレッド未確定。サーバーは Phase1 内では spread を使わない
      spread: {} as Spread,
      drawnCards: [],
      isRevealingCompleted: false,
    },
    {
      onRefreshUsage,
      onRefreshToken,
      onUnlock: () => {},
      onMessagesChange,
      onPhase1SpreadSuggested: (suggestion) => {
        if (!masterData) return;
        const matched = masterData.spreads?.find(
          (s) =>
            (suggestion.spreadNo !== undefined && s.no === suggestion.spreadNo) ||
            (suggestion.spreadName && s.name === suggestion.spreadName),
        );
        if (matched) onSpreadSuggested(matched);
      },
    },
  );

  const tarotistImageUrl = `/tarotists/${tarotist.name}.png`;
  const showSelectorInline = phase1Session.phase1Stage === "spread-selection";

  return (
    <div className="flex flex-col h-[100dvh] -m-4 md:-m-6">
      {/* ヘッダー */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-purple-100">
        <Link
          href="/"
          onClick={onHeaderBack}
          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors"
        >
          <ArrowLeft size={16} />
          {labels.backToHome}
        </Link>
        {remainingPersonal !== undefined && (
          <span className="text-xs bg-pink-50 text-pink-700 px-3 py-1 rounded-full border border-pink-100">
            {labels.remainingPersonal}
          </span>
        )}
      </div>

      {/* 上半分: タロティスト肖像画（折りたたみ可） */}
      <motion.div
        className="flex-shrink-0 overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50"
        animate={{ height: isTopCollapsed ? 0 : "40vh" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="h-full p-3">
          <div className="h-full rounded-3xl overflow-hidden shadow-xl relative">
            <img
              src={tarotistImageUrl}
              alt={tarotist.name}
              className="w-full h-full object-cover"
              style={{ objectPosition: "center 20%" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white">
              <p className="font-bold text-base">{tarotist.name}</p>
              <p className="text-xs opacity-90">{labels.phase1Title}</p>
            </div>
          </div>
        </div>
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

      {/* 下半分: ChatView (footer に CategorySpreadSelector を inline 表示) */}
      <div className="flex-1 overflow-hidden relative">
        <ChatView
          messages={phase1Session.messages}
          status={phase1Session.status}
          inputValue={phase1Session.inputValue}
          onInputChange={phase1Session.handleInputChange}
          onSend={phase1Session.handleSend}
          onKeyDown={phase1Session.handleKeyDown}
          inputDisabled={phase1Session.inputDisabled || showSelectorInline}
          keyboardOffset={keyboardHeight}
          tarotistImageUrl={tarotistImageUrl}
          tarotistIcon={tarotist.icon}
          error={phase1Session.error}
          onRetry={phase1Session.handleRetry}
          footer={
            showSelectorInline ? (
              <div className="mt-4 border-t border-purple-100 pt-4">
                <CategorySpreadSelector
                  categories={categories}
                  spreads={spreads}
                  currentPlan={currentPlan}
                  isPersonal={true}
                  remainingCount={remainingPersonal}
                  disabled={false}
                  onStartReading={onConfirmSpread}
                  labels={{
                    selectSpreadPrompt: labels.confirmSpreadPrompt,
                    spreadLabel: labels.spreadLabel,
                    selectPlaceholder: labels.selectPlaceholder,
                    spreadQuestion: labels.spreadQuestion,
                    spreadSubtitle: labels.spreadSubtitle,
                    startReading: labels.startReading,
                    limitReached: labels.limitReached,
                  }}
                />
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// PersonalPhase2View — 鑑定フェーズ
//
// phase === "reading" に遷移したときに初めてマウントされる。その時点で
// phase1Messages は完成しているので、useChatSession の initialMessages が
// 正しくキャプチャされ、サーバー側で Phase2 (clientMessages.length > 3) と
// 判定される。
// ═════════════════════════════════════════════════════════════

interface PersonalPhase2ViewProps {
  tarotist: Tarotist;
  spread: Spread;
  masterData: MasterData;
  token: string;
  initialMessages: UIMessage[];
  remainingPersonal: number | undefined;
  onReadAgain: () => void;
  onHeaderBack: () => void;
  onRefreshUsage: () => Promise<void>;
  onRefreshToken: () => Promise<string | null>;
  labels: {
    backToHome: string;
    lockedDuringReading: string;
    phase2Title: string;
    readAgain: string;
    limitReached: string;
    sessionEndedLabel: string;
    sessionEndedSubLabel: string;
  };
}

function PersonalPhase2View({
  tarotist,
  spread,
  masterData,
  token,
  initialMessages,
  remainingPersonal,
  onReadAgain,
  onHeaderBack,
  onRefreshUsage,
  onRefreshToken,
  labels,
}: PersonalPhase2ViewProps) {
  const {
    drawnCards,
    isRevealingCompleted,
    isLocked,
    setDrawnCards,
    setIsRevealingCompleted,
    setIsLocked,
  } = useSalonStore();
  const keyboardHeight = useKeyboardHeight();
  const [upperTab, setUpperTab] = useState<UpperViewerTab>("grid");
  const [isTopCollapsed, setIsTopCollapsed] = useState(false);

  // カード配布（一度だけ）
  useEffect(() => {
    if (drawnCards.length > 0) return;
    const cards = drawRandomCards(masterData, spread);
    setDrawnCards(cards);
  }, [masterData, spread, drawnCards.length, setDrawnCards]);

  // カード配布済み → 自動で全枚めくる
  useEffect(() => {
    if (drawnCards.length === 0) return;
    const timer = setTimeout(() => setIsRevealingCompleted(true), 500);
    return () => clearTimeout(timer);
  }, [drawnCards.length, setIsRevealingCompleted]);

  // 全カードめくり完了 → SPREAD_VIEW_DISPLAY_MS 後にプロフィールへ切替
  useEffect(() => {
    if (!isRevealingCompleted) return;
    const timer = setTimeout(() => setUpperTab("profile"), SPREAD_VIEW_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [isRevealingCompleted]);

  const phase2Session = useChatSession(
    {
      api: "/api/readings/personal",
      token,
      isPersonal: true,
      isPhase2: true,
      tarotist,
      spread,
      drawnCards,
      isRevealingCompleted,
      initialMessages,
    },
    {
      onRefreshUsage,
      onRefreshToken,
      onUnlock: () => setIsLocked(false),
    },
  );

  const tarotistImageUrl = `/tarotists/${tarotist.name}.png`;
  const phase2Done = phase2Session.phase2Stage === "done";
  const canReadAgain = remainingPersonal === undefined || remainingPersonal > 0;

  // アンマウント時の安全網: 強制離脱・例外時にロックが残らないよう解除
  useEffect(() => {
    return () => setIsLocked(false);
  }, [setIsLocked]);

  return (
    <>
      <ShuffleDialog
        isOpen={drawnCards.length === 0}
        onComplete={() => {}}
        cardBackPath="/cards/back.png"
      />

      <div className="flex flex-col h-[100dvh] -m-4 md:-m-6">
        {/* ヘッダー */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-purple-100">
          {isLocked ? (
            <button
              type="button"
              disabled
              title={labels.lockedDuringReading}
              className="flex items-center gap-1 text-sm text-gray-400 cursor-not-allowed"
            >
              <Lock size={14} />
              {labels.backToHome}
            </button>
          ) : (
            <Link
              href="/"
              onClick={onHeaderBack}
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors"
            >
              <ArrowLeft size={16} />
              {labels.backToHome}
            </Link>
          )}
          <span className="text-xs text-pink-600 font-medium">{labels.phase2Title}</span>
        </div>

        {/* 上半分: UpperViewer（折りたたみ可） */}
        <motion.div
          className="flex-shrink-0 overflow-hidden"
          animate={{ height: isTopCollapsed ? 0 : "40vh" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {drawnCards.length > 0 && (
            <UpperViewer
              spread={spread}
              drawnCards={drawnCards}
              isRevealingCompleted={isRevealingCompleted}
              onRevealingCompleted={() => setIsRevealingCompleted(true)}
              tarotistImageUrl={tarotistImageUrl}
              tarotistName={tarotist.name}
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

        {/* 下半分: ChatView Phase2 */}
        <div className="flex-1 overflow-hidden relative">
          <ChatView
            messages={phase2Session.messages}
            status={phase2Session.status}
            inputValue={phase2Session.inputValue}
            onInputChange={phase2Session.handleInputChange}
            onSend={phase2Session.handleSend}
            onKeyDown={phase2Session.handleKeyDown}
            onEndReading={phase2Session.handleSessionClose}
            isPhase2={true}
            phase2Stage={phase2Session.phase2Stage}
            questionsRemaining={phase2Session.questionsRemaining}
            isMessageComplete={phase2Session.isMessageComplete}
            inputDisabled={phase2Session.inputDisabled}
            keyboardOffset={keyboardHeight}
            tarotistImageUrl={tarotistImageUrl}
            tarotistIcon={tarotist.icon}
            error={phase2Session.error}
            onRetry={phase2Session.handleRetry}
            sessionEndedLabel={labels.sessionEndedLabel}
            sessionEndedSubLabel={labels.sessionEndedSubLabel}
          />

          {/* クロージング完了後のアクション */}
          {phase2Done && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-40 pointer-events-none">
              {canReadAgain ? (
                <button
                  type="button"
                  onClick={onReadAgain}
                  className="pointer-events-auto flex items-center gap-2 px-5 py-3 bg-white shadow-xl rounded-full text-sm font-bold text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <RefreshCw size={14} />
                  {labels.readAgain}
                </button>
              ) : (
                <div className="pointer-events-auto px-5 py-3 bg-gray-100 rounded-full text-sm font-medium text-gray-400">
                  {labels.limitReached}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════════
// PersonalPage — オーケストレーター
// ═════════════════════════════════════════════════════════════

export default function PersonalPage() {
  const t = useTranslations("personal");
  const tCommon = useTranslations("common");
  const tSalon = useTranslations("salon");
  const { data: session } = useSession();

  const { data: masterData, init: initMaster, tarotists, categories, spreads, isLoading } =
    useMasterStore();
  const {
    personalTarotist: selectedTarotist,
    personalSpread: selectedSpread,
    setPersonalTarotist,
    setPersonalSpread,
    setPersonalCategory,
    resetSession,
    setIsLocked,
  } = useSalonStore();
  const { refreshUsage, usage, clearReadings } = useClientStore();

  useEffect(() => {
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage]);

  // サーバーが Reading を保存したタイミングで呼ぶ
  const handleReadingSaved = useCallback(async () => {
    clearReadings();
    await refreshUsage();
  }, [clearReadings, refreshUsage]);

  const [phase, setPhase] = useState<Phase>("tarotist");
  const [phase1Messages, setPhase1Messages] = useState<UIMessage[]>([]);
  // Phase1/Phase2 View の強制リマウント用キー。「もう一度占う」で増やす。
  const [sessionKey, setSessionKey] = useState(0);

  const token = (session as { accessToken?: string })?.accessToken ?? "";

  const canPersonal = usage == null || (usage.plan?.hasPersonal ?? false);
  const premiumTarotists = useMemo(
    () => tarotists.filter((t: Tarotist) => t.plan?.code === "PREMIUM"),
    [tarotists],
  );

  const handleStartPhase1 = () => {
    if (!selectedTarotist) return;
    setPhase1Messages([]);
    setPhase("chat");
  };

  const handleConfirmSpread = ({
    category,
    spread,
  }: {
    category: ReadingCategory | null;
    spread: Spread;
  }) => {
    setPersonalSpread(spread);
    setPersonalCategory(category);
    setIsLocked(true); // Phase2 開始 = AI 課金開始 → ナビゲーションロック
    setPhase("reading");
  };

  const handleReadAgain = () => {
    resetSession();
    setPhase1Messages([]);
    setSessionKey((k) => k + 1);
    setPhase("chat");
  };

  const handleHeaderBack = () => {
    resetSession();
    setPhase1Messages([]);
  };

  const onRefreshToken = useCallback(async () => token, [token]);

  const remainingPersonal = usage?.remainingPersonal;
  const currentPlan = (usage?.plan as Plan | undefined) ?? null;

  // ═════════════════════════════════════════════════════════════
  // Phase 0: タロティスト選択
  // ═════════════════════════════════════════════════════════════
  if (phase === "tarotist") {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors"
          >
            <ArrowLeft size={16} />
            {tCommon("backToHome")}
          </Link>
          {remainingPersonal !== undefined && canPersonal && (
            <span className="text-xs bg-pink-50 text-pink-700 px-3 py-1 rounded-full border border-pink-100">
              {tSalon("remainingPersonal", { count: remainingPersonal })}
            </span>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-800">{t("title")}</h1>
        <p className="text-sm text-gray-500">{t("tarotistPrompt")}</p>

        {!canPersonal ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400 mb-4">{t("premiumOnly")}</p>
            <Link
              href="/plans"
              className="inline-block px-5 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow hover:opacity-90 transition-opacity"
            >
              {tSalon("upgradeAction")}
            </Link>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-4 border-purple-300 border-t-purple-600 animate-spin" />
          </div>
        ) : (
          <>
            <div
              className="bg-white/50 rounded-2xl border shadow-sm overflow-hidden mx-auto max-w-md"
              style={{ height: "600px" }}
            >
              <TarotistCarouselPortrait
                tarotists={premiumTarotists}
                selectedTarotist={selectedTarotist}
                onSelect={setPersonalTarotist}
                currentPlan={
                  (usage?.plan as Parameters<typeof TarotistCarouselPortrait>[0]["currentPlan"]) ??
                  null
                }
              />
            </div>
            <div className="px-1 pb-2 max-w-md mx-auto">
              <button
                type="button"
                onClick={handleStartPhase1}
                disabled={
                  !selectedTarotist ||
                  (remainingPersonal !== undefined && remainingPersonal <= 0)
                }
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg shadow-2xl hover:from-purple-600 hover:to-pink-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {t("startChat")}
              </button>
              {remainingPersonal !== undefined && remainingPersonal <= 0 && (
                <div className="text-center text-xs text-black bg-purple-200/50 rounded-lg px-2 py-1 mt-2">
                  {tSalon("limitReached")}
                </div>
              )}
              {!selectedTarotist && (
                <div className="text-center text-xs text-gray-500 mt-2">
                  {t("selectTarotistFirst")}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  if (!selectedTarotist) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">{t("selectTarotistFirst")}</p>
        <button
          onClick={() => setPhase("tarotist")}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg"
        >
          {tCommon("back")}
        </button>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // Phase 1: 対話
  // ═════════════════════════════════════════════════════════════
  if (phase === "chat") {
    return (
      <AnimatePresence mode="wait">
        <PersonalPhase1View
          key={`phase1-${sessionKey}`}
          tarotist={selectedTarotist}
          masterData={masterData}
          token={token}
          remainingPersonal={remainingPersonal}
          currentPlan={currentPlan}
          categories={categories}
          spreads={spreads}
          onMessagesChange={setPhase1Messages}
          onSpreadSuggested={setPersonalSpread}
          onConfirmSpread={handleConfirmSpread}
          onHeaderBack={handleHeaderBack}
          onRefreshUsage={handleReadingSaved}
          onRefreshToken={onRefreshToken}
          labels={{
            backToHome: tCommon("backToHome"),
            remainingPersonal:
              remainingPersonal !== undefined
                ? tSalon("remainingPersonal", { count: remainingPersonal })
                : "",
            phase1Title: t("phase1Title"),
            confirmSpreadPrompt: t("confirmSpreadPrompt"),
            spreadLabel: tSalon("spreadLabel"),
            selectPlaceholder: tSalon("selectPlaceholder"),
            spreadQuestion: tSalon("spreadQuestion"),
            spreadSubtitle: tSalon("spreadSubtitle"),
            startReading: t("startReading"),
            limitReached: tSalon("limitReached"),
          }}
        />
      </AnimatePresence>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // Phase 2: 鑑定
  // ═════════════════════════════════════════════════════════════
  if (!selectedSpread || !masterData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">データの準備中...</p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <PersonalPhase2View
        key={`phase2-${sessionKey}`}
        tarotist={selectedTarotist}
        spread={selectedSpread}
        masterData={masterData}
        token={token}
        initialMessages={phase1Messages}
        remainingPersonal={remainingPersonal}
        onReadAgain={handleReadAgain}
        onHeaderBack={handleHeaderBack}
        onRefreshUsage={handleReadingSaved}
        onRefreshToken={onRefreshToken}
        labels={{
          backToHome: tCommon("backToHome"),
          lockedDuringReading: tCommon("lockedDuringReading"),
          phase2Title: t("phase2Title"),
          readAgain: t("readAgain"),
          limitReached: t("limitReached"),
          sessionEndedLabel: t("sessionEndedLabel"),
          sessionEndedSubLabel: t("sessionEndedSubLabel"),
        }}
      />
    </AnimatePresence>
  );
}
