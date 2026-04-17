"use client";

import { ChatView } from "@shared/components/chat/chat-view";
import { LowerViewer } from "@shared/components/tarot/lower-viewer";
import { RevealPromptPanel } from "@shared/components/reading/reveal-prompt-panel";
import { ShuffleDialog } from "@shared/components/reading/shuffle-dialog";
import { UpperViewer } from "@shared/components/tarot/upper-viewer";
import { useChatSession } from "@shared/hooks/use-chat-session";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useSalonStore } from "@/lib/client/stores/salon-store";
import { drawRandomCards } from "@/lib/client/services/draw-service";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const onResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setHeight(Math.max(0, offset));
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

export default function ReadingPage() {
  const t = useTranslations("reading");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { data: session } = useSession();

  const { data: masterData, init: initMaster } = useMasterStore();
  const {
    selectedTarotist,
    selectedSpread,
    selectedCategory,
    drawnCards,
    isRevealingCompleted,
    setDrawnCards,
    setIsRevealingCompleted,
  } = useSalonStore();
  const { refreshUsage } = useClientStore();

  const [isReady, setIsReady] = useState(false);

  // masterData が未初期化の場合に初期化（直接URLアクセス対策）
  useEffect(() => {
    initMaster();
  }, [initMaster]);

  // カードを即座に引く（シャッフルアニメーションと並行）
  // isOpen={drawnCards.length === 0} で制御するため、カードが決定したタイミングで
  // アニメーションの現サイクル終了後に自動終了する（モバイルと同じ仕様）
  useEffect(() => {
    if (!masterData || !selectedSpread || drawnCards.length > 0) return;
    const cards = drawRandomCards(masterData, selectedSpread);
    setDrawnCards(cards);
  }, [masterData, selectedSpread, drawnCards.length, setDrawnCards]);

  const handleShuffleComplete = () => {
    setIsReady(true);
  };

  const token = (session as { accessToken?: string })?.accessToken ?? "";
  const keyboardHeight = useKeyboardHeight();

  const {
    messages,
    status,
    phase2Stage,
    questionsRemaining,
    inputValue,
    inputDisabled,
    isMessageComplete,
    handleSend,
    handleInputChange,
    handleSessionClose,
  } = useChatSession(
    {
      api: "/api/readings/simple",
      token,
      isPersonal: false,
      isPhase2: false,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      tarotist: selectedTarotist!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      spread: selectedSpread!,
      category: selectedCategory ?? undefined,
      drawnCards,
      isRevealingCompleted,
    },
    {
      onRefreshUsage: refreshUsage,
      onRefreshToken: async () => token,
      onUnlock: () => {},
    }
  );

  if (!selectedSpread || !selectedTarotist) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">{t("loadError")}</p>
        <button
          onClick={() => router.push("/salon")}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg"
        >
          {tCommon("backToSalon")}
        </button>
      </div>
    );
  }

  const selectorContent = (
    <RevealPromptPanel
      isAllRevealed={isRevealingCompleted}
      onRevealAll={() => setIsRevealingCompleted(true)}
    />
  );

  const personalContent = (
    <ChatView
      messages={messages}
      status={status}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onSend={handleSend}
      onEndReading={handleSessionClose}
      phase2Stage={phase2Stage}
      questionsRemaining={questionsRemaining}
      isMessageComplete={isMessageComplete}
      keyboardOffset={keyboardHeight}
    />
  );

  return (
    <>
      <ShuffleDialog
        isOpen={drawnCards.length === 0}
        onComplete={handleShuffleComplete}
        cardBackPath="/cards/back.png"
      />

      <div className="flex flex-col h-[100dvh] -m-4 md:-m-6">
        {/* 上部: カードビューア */}
        <div className="flex-shrink-0" style={{ height: "45vh" }}>
          {isReady && (
            <UpperViewer
              spread={selectedSpread}
              drawnCards={drawnCards}
              isRevealingCompleted={isRevealingCompleted}
              onRevealingCompleted={() => setIsRevealingCompleted(true)}
              tarotistImageUrl={`/tarotists/${selectedTarotist.name}.png`}
              tarotistName={selectedTarotist.name}
              cardBasePath="/cards"
            />
          )}
        </div>

        {/* 下部: チャット/セレクター */}
        <div className="flex-1 overflow-hidden">
          <LowerViewer
            selectorContent={selectorContent}
            personalContent={personalContent}
            defaultMode="personal"
          />
        </div>
      </div>
    </>
  );
}
