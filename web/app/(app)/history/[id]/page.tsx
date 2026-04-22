"use client";

import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import {
  buildTarotCardMap,
  hydrateDrawnCards,
} from "@/lib/client/utils/drawn-card";
import { fetchReadingById } from "@/lib/client/services/client-service";
import { ChatColumn } from "@/components/reading/chat-column";
import { SpreadRevealColumn } from "@/components/reading/spread-reveal-column";
import { TwoColumnReadingLayout } from "@/components/reading/two-column-reading-layout";
import type { ChatMessage, DrawnCard, Reading } from "@shared/lib/types";
import type { UIMessage } from "ai";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * DB の ChatMessage を ChatView で使える UIMessage に変換する。
 * - role: "USER" → "user", "TAROTIST" → "assistant"
 * - content は文字列のまま渡す（ChatView / MessageContent が Markdown 解析する）
 */
function toUIMessages(msgs: ChatMessage[]): UIMessage[] {
  return msgs.map((msg, i) => ({
    id: msg.id ?? `msg-${i}`,
    role: (msg.role === "USER" ? "user" : "assistant") as "user" | "assistant",
    content: msg.message,
    parts: [{ type: "text" as const, text: msg.message }],
  }));
}

export default function HistoryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const t = useTranslations("history");
  const tReading = useTranslations("reading");
  const { readings } = useClientStore();
  const masterData = useMasterStore((state) => state.data);
  const initMaster = useMasterStore((state) => state.init);
  const [fetched, setFetched] = useState<Reading | null | "loading">("loading");
  const [showSpread, setShowSpread] = useState(true);

  const cached = readings.find((r) => r.id === id);

  useEffect(() => {
    if (cached) {
      setFetched(null);
      return;
    }
    fetchReadingById(id)
      .then((r) => setFetched(r))
      .catch(() => setFetched(null));
  }, [id, cached]);

  useEffect(() => {
    void initMaster();
  }, [initMaster]);

  const reading = cached ?? (fetched !== "loading" ? fetched : null);
  const isLoading = !cached && fetched === "loading";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>{t("loadMore")}</p>
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-muted-foreground mb-4">{t("notFound")}</p>
        <button
          onClick={() => router.push("/history")}
          className="text-sm text-primary hover:underline"
        >
          {t("backToHistory")}
        </button>
      </div>
    );
  }

  const drawnCards = hydrateDrawnCards(
    reading.cards as DrawnCard[] | undefined,
    buildTarotCardMap(masterData),
  );

  const uiMessages = toUIMessages(reading.chatMessages ?? []);

  const hasSpread =
    !!reading.spread &&
    !!reading.spread.cells &&
    reading.spread.cells.length > 0 &&
    drawnCards.length > 0;

  const tarotist = reading.tarotist;

  return (
    <TwoColumnReadingLayout
      left={
        <ChatColumn
          tarotistImageUrl={`/tarotists/${tarotist?.name ?? "unknown"}.png`}
          tarotistName={tarotist?.name ?? ""}
          tarotistIcon={tarotist?.icon ?? undefined}
          tarotistTitle={tarotist?.title ?? undefined}
          tarotistTrait={tarotist?.trait ?? undefined}
          messages={uiMessages}
          status="idle"
          inputValue=""
          onInputChange={() => {}}
          onSend={() => {}}
          onKeyDown={() => {}}
          inputDisabled={true}
          initialPortraitExpanded={false}
        />
      }
      right={
        hasSpread ? (
          <SpreadRevealColumn
            spread={reading.spread!}
            drawnCards={drawnCards}
            isRevealingCompleted={true}
            onRevealAll={() => {}}
            revealAllLabel={tReading("revealAll")}
            revealPromptLabel={tReading("revealPrompt")}
            allRevealedLabel={tReading("allRevealed")}
            gridLabel={tReading("tabCards")}
            carouselLabel={tReading("carousel")}
          />
        ) : undefined
      }
      rightVisible={showSpread}
      onToggleRight={() => setShowSpread((v) => !v)}
      backLabel={t("backToHistory")}
      backHref="/history"
      isLocked={false}
      showToggle={hasSpread}
      showSpreadLabel={tReading("showSpread")}
      hideSpreadLabel={tReading("hideSpread")}
    />
  );
}
