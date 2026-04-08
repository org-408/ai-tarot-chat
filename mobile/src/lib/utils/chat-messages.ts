import type { UIMessage } from "ai";
import type { ChatMessage } from "../../../../shared/lib/types";

export function chatMessagesToUIMessages(messages: ChatMessage[]): UIMessage[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role === "USER" ? "user" : "assistant",
    parts: [{ type: "text" as const, text: msg.message }],
  }));
}
