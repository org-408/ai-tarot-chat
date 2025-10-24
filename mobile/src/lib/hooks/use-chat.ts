import { useCallback } from "react";
import type {
  DrawnCard,
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../../../shared/lib/types";
import { useChatStore, type ChatStatus, type Message } from "../stores/chat";

interface UseChatParams {
  tarotist: Tarotist;
  spread: Spread;
  category: ReadingCategory;
  drawnCards: DrawnCard[];
}

interface UseChatReturn {
  messages: Message[];
  currentStreamingMessage: string;
  status: ChatStatus;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  stopStreaming: () => void;
  clearMessages: () => void;
}

export function useChat({
  tarotist,
  spread,
  category,
  drawnCards,
}: UseChatParams): UseChatReturn {
  const domain = import.meta.env.VITE_BFF_URL;

  const {
    messages,
    status,
    currentStreamingMessage,
    error,
    addUserMessage,
    startStreaming,
    appendStreamChunk,
    finalizeStreamingMessage,
    stopStreaming: stopStreamingAction,
    setError,
    clearMessages,
    setAbortController,
  } = useChatStore();

  const sendMessage = useCallback(
    async (text: string) => {
      try {
        // ユーザーメッセージを追加
        addUserMessage(text);
        startStreaming();

        // AbortControllerを作成
        const controller = new AbortController();
        setAbortController(controller);

        // 現在のmessagesから履歴を構築（zustandストアから直接取得）
        const currentMessages = useChatStore.getState().messages;
        const messageHistory = currentMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        // 新しいユーザーメッセージを追加
        messageHistory.push({ role: "user", content: text });

        const response = await fetch(`${domain}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: messageHistory,
            tarotist,
            spread,
            category,
            drawnCards,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTPエラー: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("レスポンスボディを読み取れません");
        }

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // デコードしてバッファに追加
          buffer += decoder.decode(value, { stream: true });

          // SSE行ごとに処理
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // 最後の不完全な行を保持

          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue;

            const data = line.replace(/^data: /, "").trim();

            if (data === "[DONE]") {
              finalizeStreamingMessage();
              return;
            }

            try {
              const parsed = JSON.parse(data) as { content?: string };
              if (parsed.content) {
                appendStreamChunk(parsed.content);
              }
            } catch (parseError) {
              console.error("SSEデータのパースに失敗:", parseError);
            }
          }
        }

        finalizeStreamingMessage();
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === "AbortError") {
            console.log("リクエストが中断されました");
            stopStreamingAction();
          } else {
            console.error("チャットエラー:", err);
            setError(err.message || "エラーが発生しました");
          }
        } else {
          console.error("予期しないエラー:", err);
          setError("予期しないエラーが発生しました");
        }
      }
    },
    [
      tarotist,
      spread,
      category,
      drawnCards,
      domain,
      addUserMessage,
      startStreaming,
      appendStreamChunk,
      finalizeStreamingMessage,
      stopStreamingAction,
      setError,
      setAbortController,
    ]
  );

  const stopStreaming = useCallback(() => {
    stopStreamingAction();
  }, [stopStreamingAction]);

  return {
    messages,
    currentStreamingMessage,
    status,
    error,
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}
