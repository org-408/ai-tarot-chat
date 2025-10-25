import type {
  DrawnCard,
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../../../shared/lib/types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatStreamParams {
  messages: ChatMessage[];
  tarotist: Tarotist;
  spread: Spread;
  category: ReadingCategory;
  drawnCards: DrawnCard[];
}

export interface StreamChunk {
  content?: string;
}

/**
 * チャットストリーミングサービス
 * fetch + ReadableStream でSSE形式のレスポンスを処理
 * (EventSourceはGET onlyのため、POSTする場合はfetchを使用)
 */
export class ChatService {
  /**
   * チャットメッセージをストリーミング送信
   *
   * @param params - チャットパラメータ
   * @param onChunk - チャンクを受信したときのコールバック
   * @param signal - AbortSignal（キャンセル用）
   */
  async streamChat(
    params: ChatStreamParams,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const domain = import.meta.env.VITE_BFF_URL;

    const response = await fetch(`${domain}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(params),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTPエラー: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("レスポンスボディを読み取れません");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // デコードしてバッファに追加
        buffer += decoder.decode(value, { stream: true });

        // SSE行ごとに処理 (行区切りは "\n\n")
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // 最後の不完全な行を保持

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;

          const data = line.replace(/^data: /, "").trim();

          if (data === "[DONE]") {
            return;
          }

          try {
            const parsed = JSON.parse(data) as StreamChunk;
            if (parsed.content) {
              onChunk(parsed.content);
            }
          } catch (parseError) {
            console.error("SSEデータのパースに失敗:", parseError);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

/**
 * シングルトンインスタンス
 */
export const chatService = new ChatService();
