import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type ChatStatus = "idle" | "streaming" | "error";

export interface ChatState {
  messages: Message[];
  status: ChatStatus;
  currentStreamingMessage: string;
  error: string | null;
  abortController: AbortController | null;

  // Actions
  addUserMessage: (content: string) => void;
  startStreaming: () => void;
  appendStreamChunk: (chunk: string) => void;
  finalizeStreamingMessage: () => void;
  stopStreaming: () => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  setAbortController: (controller: AbortController | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  status: "idle",
  currentStreamingMessage: "",
  error: null,
  abortController: null,

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
}));
