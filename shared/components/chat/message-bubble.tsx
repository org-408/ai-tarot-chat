import type { UIMessage } from "ai";
import { MessageContent } from "./message-content";

interface MessageBubbleProps {
  message: UIMessage;
  tarotistImageUrl?: string;
  tarotistIcon?: string;
  /** 占い師アバターを表示するか。デフォルト true */
  showAvatar?: boolean;
}

/**
 * 1件分のチャットメッセージ表示。ユーザー / AI で見た目を切り替える。
 * @ai-sdk/react 依存ゼロ。
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  tarotistImageUrl,
  tarotistIcon,
  showAvatar = true,
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

  if (!showAvatar) {
    return (
      <div className="flex justify-start">
        <div className="flex-1 min-w-0">
          <MessageContent content={textContent} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2">
      {/* 占い師アバター */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border border-purple-200 shadow-sm mt-1">
        {tarotistImageUrl ? (
          <img
            src={tarotistImageUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 20%" }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-700 to-indigo-800 flex items-center justify-center text-xs text-white">
            {tarotistIcon ?? "✦"}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <MessageContent content={textContent} />
      </div>
    </div>
  );
};
