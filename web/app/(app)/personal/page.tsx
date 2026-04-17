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
import { saveReading } from "@/lib/client/services/client-service";
import type { UIMessage } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

type Phase = "chat" | "reading";

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

export default function PersonalPage() {
  const t = useTranslations("personal");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { data: session } = useSession();

  const { data: masterData, init: initMaster } = useMasterStore();
  const {
    selectedTarotist,
    selectedSpread,
    drawnCards,
    isRevealingCompleted,
    setDrawnCards,
    setIsRevealingCompleted,
  } = useSalonStore();
  const { refreshUsage } = useClientStore();

  // masterData が未初期化の場合に初期化（直接URLアクセス対策）
  useEffect(() => {
    initMaster();
  }, [initMaster]);

  const [phase, setPhase] = useState<Phase>("chat");
  const [phase1Messages, setPhase1Messages] = useState<UIMessage[]>([]);
  const [shuffleOpen, setShuffleOpen] = useState(false);
  const keyboardHeight = useKeyboardHeight();

  const token = (session as { accessToken?: string })?.accessToken ?? "";

  // Phase 1: 質問収集チャット
  const phase1Session = useChatSession(
    {
      api: "/api/readings/personal",
      token,
      isPersonal: true,
      isPhase2: false,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      tarotist: selectedTarotist!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      spread: selectedSpread!,
      drawnCards: [],
      isRevealingCompleted: false,
    },
    {
      onSave: async () => ({ reading: { id: "" } }),
      onRefreshUsage: refreshUsage,
      onRefreshToken: async () => token,
      onUnlock: () => {
        // Phase1 完了時: メッセージを保存してシャッフル開始
        setPhase1Messages(phase1Session.messages);
        setShuffleOpen(true);
      },
      onMessagesChange: () => {},
    }
  );

  // Phase 2: カード + 解釈チャット
  const phase2Session = useChatSession(
    {
      api: "/api/readings/personal",
      token,
      isPersonal: true,
      isPhase2: true,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      tarotist: selectedTarotist!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      spread: selectedSpread!,
      drawnCards,
      isRevealingCompleted,
      initialMessages: phase1Messages,
    },
    {
      onSave: async (data) => {
        try {
          const result = await saveReading(data);
          await refreshUsage();
          return { reading: { id: result.id } };
        } catch {
          return { reading: { id: "" } };
        }
      },
      onRefreshUsage: refreshUsage,
      onRefreshToken: async () => token,
      onUnlock: () => {},
    }
  );

  // shuffleOpen=true になった直後にカードを引き、isOpen=false を送信
  // → ShuffleDialog は現サイクル終了後に自動終了する（モバイルと同仕様）
  useEffect(() => {
    if (!shuffleOpen || drawnCards.length > 0 || !masterData || !selectedSpread) return;
    const cards = drawRandomCards(masterData, selectedSpread);
    setDrawnCards(cards);
    setShuffleOpen(false);
  }, [shuffleOpen, drawnCards.length, masterData, selectedSpread, setDrawnCards]);

  const handleShuffleComplete = () => {
    setTimeout(() => setIsRevealingCompleted(true), 500);
    setPhase("reading");
  };

  const readingRef = useRef(false);
  useEffect(() => {
    if (phase === "reading" && drawnCards.length > 0 && !readingRef.current) {
      readingRef.current = true;
    }
  }, [phase, drawnCards]);

  if (!selectedSpread || !selectedTarotist) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">{t("selectTarotistAndSpread")}</p>
        <button
          onClick={() => router.push("/salon")}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg"
        >
          {tCommon("backToSalon")}
        </button>
      </div>
    );
  }

  if (selectedTarotist.plan?.code !== "PREMIUM") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">{t("premiumOnly")}</p>
        <button
          onClick={() => router.push("/salon")}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg"
        >
          {tCommon("backToSalon")}
        </button>
      </div>
    );
  }

  if (phase === "chat") {
    return (
      <div className="flex flex-col h-[100dvh] -m-4 md:-m-6">
        <div className="flex-shrink-0 p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <div className="flex items-center gap-3">
            <img
              src={`/tarotists/${selectedTarotist.name}.png`}
              alt={selectedTarotist.name}
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <h2 className="font-bold text-gray-900">
                {selectedTarotist.icon} {selectedTarotist.name}
              </h2>
              <p className="text-sm text-gray-500">{t("phase1Title")}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatView
            messages={phase1Session.messages}
            status={phase1Session.status}
            inputValue={phase1Session.inputValue}
            onInputChange={phase1Session.handleInputChange}
            onSend={phase1Session.handleSend}
            phase2Stage={phase1Session.phase2Stage}
            questionsRemaining={phase1Session.questionsRemaining}
            isMessageComplete={false}
            keyboardOffset={keyboardHeight}
          />
        </div>
      </div>
    );
  }

  // Phase 2 (reading)
  const selectorContent = (
    <RevealPromptPanel
      isAllRevealed={isRevealingCompleted}
      onRevealAll={() => setIsRevealingCompleted(true)}
    />
  );

  const personalContent = (
    <ChatView
      messages={phase2Session.messages}
      status={phase2Session.status}
      inputValue={phase2Session.inputValue}
      onInputChange={phase2Session.handleInputChange}
      onSend={phase2Session.handleSend}
      onEndReading={phase2Session.handleSessionClose}
      phase2Stage={phase2Session.phase2Stage}
      questionsRemaining={phase2Session.questionsRemaining}
      isMessageComplete={phase2Session.isMessageComplete}
      keyboardOffset={keyboardHeight}
    />
  );

  return (
    <>
      <ShuffleDialog
        isOpen={shuffleOpen}
        onComplete={handleShuffleComplete}
        cardBackPath="/cards/back.png"
      />
      <div className="flex flex-col h-[100dvh] -m-4 md:-m-6">
        <div className="flex-shrink-0" style={{ height: "45vh" }}>
          <UpperViewer
            spread={selectedSpread}
            drawnCards={drawnCards}
            isRevealingCompleted={isRevealingCompleted}
            onRevealingCompleted={() => setIsRevealingCompleted(true)}
            tarotistImageUrl={`/tarotists/${selectedTarotist.name}.png`}
            tarotistName={selectedTarotist.name}
            cardBasePath="/cards"
          />
        </div>
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
