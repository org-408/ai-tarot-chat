import { type ChatContext, useChatStore } from "../stores/chat";

/**
 * チャットフック
 *
 * zustand storeの薄いラッパー
 * hooks としての体裁を整えるだけの便利機能
 */
export function useChat({
  tarotist,
  spread,
  category,
  drawnCards,
}: ChatContext) {
  const {
    messages,
    status,
    currentStreamingMessage,
    error,
    setContext,
    sendMessage,
    stopStreaming,
    clearMessages,
  } = useChatStore();

  // コンテキストを初期化・更新
  setContext({ tarotist, spread, category, drawnCards });

  return {
    // 状態
    messages,
    currentStreamingMessage,
    status,
    error,

    // アクション（パラメータをバインドして返す）
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}
