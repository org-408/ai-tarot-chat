import { create } from "zustand";
import type {
  DrawnCard,
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../../../shared/lib/types";
import { chatService } from "../services/chat";

export interface ChatContext {
  tarotist: Tarotist | null;
  spread: Spread | null;
  category: ReadingCategory | null;
  drawnCards: DrawnCard[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type ChatStatus = "idle" | "streaming" | "error";

export interface SendMessageParams {
  text: string;
  tarotist: Tarotist;
  spread: Spread;
  category: ReadingCategory;
  drawnCards: DrawnCard[];
}

export interface ChatState {
  messages: Message[];
  status: ChatStatus;
  currentStreamingMessage: string;
  error: string | null;
  abortController: AbortController | null;
  context: ChatContext;

  // Actions (内部用)
  setContext: (context: Partial<ChatContext>) => void;
  addUserMessage: (content: string) => void;
  startStreaming: () => void;
  appendStreamChunk: (chunk: string) => void;
  finalizeStreamingMessage: () => void;
  stopStreaming: () => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  setAbortController: (controller: AbortController | null) => void;

  // Public Actions (外部公開用 - ビジネスロジック)
  sendMessage: (text: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  status: "idle",
  currentStreamingMessage: "",
  error: null,
  abortController: null,
  context: {
    tarotist: null,
    spread: null,
    category: null,
    drawnCards: [],
  },

  setContext: (context) => {
    set((state) => ({
      context: { ...state.context, ...context },
    }));
  },

  addUserMessage: (content: string) => {
    const message: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, message],
      error: null,
    }));
  },

  startStreaming: () => {
    set({
      status: "streaming",
      currentStreamingMessage: "",
      error: null,
    });
  },

  appendStreamChunk: (chunk: string) => {
    set((state) => ({
      currentStreamingMessage: state.currentStreamingMessage + chunk,
    }));
  },

  finalizeStreamingMessage: () => {
    const { currentStreamingMessage, messages } = get();

    if (currentStreamingMessage.trim()) {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: currentStreamingMessage,
        timestamp: Date.now(),
      };

      set({
        messages: [...messages, assistantMessage],
        currentStreamingMessage: "",
        status: "idle",
        abortController: null,
      });
    } else {
      set({
        currentStreamingMessage: "",
        status: "idle",
        abortController: null,
      });
    }
  },

  stopStreaming: () => {
    const { abortController } = get();

    if (abortController) {
      abortController.abort();
    }

    set({
      status: "idle",
      abortController: null,
    });
  },

  setError: (error: string | null) => {
    set({
      error,
      status: "error",
      abortController: null,
    });
  },

  clearMessages: () => {
    set({
      messages: [],
      currentStreamingMessage: "",
      error: null,
      status: "idle",
      abortController: null,
    });
  },

  setAbortController: (controller: AbortController | null) => {
    set({ abortController: controller });
  },

  // ✅ ビジネスロジック: メッセージ送信
  sendMessage: async (text: string) => {
    const context = get().context;
    const { tarotist, spread, category, drawnCards } = context;

    if (!tarotist || !spread || !category) {
      get().setError("コンテキストが設定されていません");
      return;
    }

    try {
      // ユーザーメッセージを追加
      get().addUserMessage(text);
      get().startStreaming();

      // AbortControllerを作成
      const controller = new AbortController();
      get().setAbortController(controller);

      // 現在のmessagesから履歴を構築
      const currentMessages = get().messages;
      const messageHistory = currentMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // 新しいユーザーメッセージを追加
      messageHistory.push({ role: "user", content: text });

      // ChatServiceを使用してストリーミング
      await chatService.streamChat(
        {
          messages: messageHistory,
          tarotist,
          spread,
          category,
          drawnCards,
        },
        (chunk) => get().appendStreamChunk(chunk),
        controller.signal
      );

      // ストリーミング完了
      get().finalizeStreamingMessage();
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          console.log("リクエストが中断されました");
          get().stopStreaming();
        } else {
          console.error("チャットエラー:", err);
          get().setError(err.message || "エラーが発生しました");
        }
      } else {
        console.error("予期しないエラー:", err);
        get().setError("予期しないエラーが発生しました");
      }
    }
  },
}));
