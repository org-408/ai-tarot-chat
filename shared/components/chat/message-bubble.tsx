import type { UIMessage } from "ai";
import { MessageContent } from "./message-content";

interface MessageBubbleProps {
  message: UIMessage;
  isStreaming?: boolean;
}

/**
 * 1件分のチャットメッセージ表示。ユーザー / AI で見た目を切り替える。
 * @ai-sdk/react 依存ゼロ。
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
}) => {
  const textContent = message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join("");

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-gray-100 rounded-3xl px-4 py-3 inline-block max-w-[85%]">
          <p className="text-base text-gray-900 whitespace-pre-wrap">
            {textContent}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <MessageContent content={textContent} isStreaming={isStreaming} />
    </div>
  );
};
