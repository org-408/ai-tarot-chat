import type { UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import ChatInput from "./chat-input";
import { MessageBubble } from "./message-bubble";

interface ChatError {
  message: string;
  retryable?: boolean;
  isInputError?: boolean;
}

interface ChatViewProps {
  messages: UIMessage[];
  /** useChat の status */
  status: "idle" | "submitted" | "streaming" | "error";
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  isFocused?: boolean;
  /** キーボード高さ (px)。外部から注入 */
  keyboardOffset?: number;
  inputDisabled?: boolean;
  /** 入力エリアの placeholder */
  placeholder?: string;

  /** Phase2 関連 */
  isPhase2?: boolean;
  phase2Stage?: "chatting" | "saving" | "done";
  /** メッセージ受信完了フラグ（入力エリア表示条件） */
  isMessageComplete?: boolean;
  /** Phase2 残り質問数 */
  questionsRemaining?: number;
  onEndReading?: () => void;

  /** エラー表示 */
  error?: ChatError | null;
  onRetry?: () => void;
  onBack?: () => void;

  /** 保存中インジケーター */
  isSaving?: boolean;

  /** 戻る/もう一度占うボタン */
  shouldShowBackButton?: boolean;
  backButtonLabel?: string;

  /** 占い師アバター */
  tarotistImageUrl?: string;
  tarotistIcon?: string;
  /** 占い師アバターを表示するか。デフォルト true */
  showAvatar?: boolean;

  /** フッタースロット（RevealPromptPanel 等を差し込む用） */
  footer?: React.ReactNode;

  /** セッション終了バナーのテキスト */
  sessionEndedLabel?: string;
  sessionEndedSubLabel?: string;
}

/**
 * チャット画面の純粋な表示コンポーネント。
 * @ai-sdk/react 依存ゼロ。全データは props で受け取る。
 */
export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  status,
  inputValue,
  onInputChange,
  onSend,
  onKeyDown,
  onFocus,
  onBlur,
  textareaRef,
  isFocused = false,
  keyboardOffset = 0,
  inputDisabled = false,
  placeholder,
  isPhase2 = false,
  phase2Stage,
  isMessageComplete = false,
  questionsRemaining,
  onEndReading,
  error,
  onRetry,
  onBack,
  isSaving = false,
  shouldShowBackButton = false,
  backButtonLabel = "← もう一度占う",
  footer,
  sessionEndedLabel = "パーソナル占いセッションが終了しました",
  sessionEndedSubLabel = "またいつでもご相談ください",
  tarotistImageUrl,
  tarotistIcon,
  showAvatar = true,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, status]);

  const isProcessing = status === "submitted" || status === "streaming";
  const showTypingIndicator =
    isProcessing ||
    isSaving ||
    (isPhase2 && phase2Stage === "saving");

  const showPhase2Input =
    isPhase2 &&
    isMessageComplete &&
    !inputDisabled &&
    phase2Stage === "chatting" &&
    !isProcessing;

  const showPhase1Input =
    !isPhase2 && !inputDisabled && !isProcessing;

  const lastMessageIndex = messages.length - 1;

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white px-4 py-6 space-y-6 pb-26">
        {messages.map((message, index) => (
          <MessageBubble
            key={index}
            message={message}
            isStreaming={
              index === lastMessageIndex &&
              message.role === "assistant" &&
              status === "streaming"
            }
            tarotistImageUrl={tarotistImageUrl}
            tarotistIcon={tarotistIcon}
            showAvatar={showAvatar}
          />
        ))}

        {/* Typing indicator */}
        {showTypingIndicator && (
          <div className="flex gap-1">
            {[0, 150, 300].map((delay) => (
              <div
                key={delay}
                className="w-4 h-4 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
            <div className="font-semibold mb-1">
              {error.isInputError
                ? "入力内容を確認してください"
                : "占いを続けられませんでした"}
            </div>
            <p className="whitespace-pre-wrap leading-6">{error.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {error.retryable && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  もう一度試す
                </button>
              )}
              {!error.isInputError && onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700"
                >
                  戻る
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer slot */}
      {footer}

      {/* Back button */}
      <AnimatePresence>
        {shouldShowBackButton && !isSaving && !error && (
          <motion.button
            key="back-button"
            initial={{ opacity: 0, scale: 0.7, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute bottom-6 right-6 z-50 shadow-xl rounded-full px-5 py-3 font-bold flex items-center gap-2 bg-white/20 text-purple-600"
            onClick={onBack}
          >
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              {backButtonLabel}
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Phase2 完了バナー */}
      <AnimatePresence>
        {isPhase2 && phase2Stage === "done" && !error && (
          <motion.div
            key="session-ended"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="px-4 py-5 bg-gradient-to-r from-purple-50 to-pink-50 border-t border-purple-100 text-center"
          >
            <div className="text-sm font-medium text-purple-700 mb-1">
              {sessionEndedLabel}
            </div>
            <div className="text-xs text-gray-400">{sessionEndedSubLabel}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase2: 残り質問数バナー + 入力 */}
      {showPhase2Input && questionsRemaining !== undefined && (
        <>
          <div
            className={`px-4 py-3 border-t transition-colors ${
              questionsRemaining === 1
                ? "bg-amber-50 border-amber-100"
                : "bg-purple-50 border-purple-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`text-sm font-medium ${
                  questionsRemaining === 1 ? "text-amber-600" : "text-purple-600"
                }`}
              >
                {questionsRemaining === 1
                  ? `💬 最後の質問ができます（残り 1 問）`
                  : `💬 鑑定について質問できます（残り ${questionsRemaining} 問）`}
              </div>
              {onEndReading && (
                <button
                  onClick={onEndReading}
                  className="text-xs text-gray-500 underline ml-2 shrink-0"
                >
                  占いを終わる
                </button>
              )}
            </div>
          </div>
          <ChatInput
            value={inputValue}
            onChange={onInputChange}
            onSend={onSend}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            textareaRef={textareaRef}
            isFocused={isFocused}
            keyboardOffset={keyboardOffset}
            placeholder="カードや鑑定について質問する..."
            status={status}
          />
        </>
      )}

      {/* Phase1 入力 */}
      {showPhase1Input && (
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSend={onSend}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          textareaRef={textareaRef}
          isFocused={isFocused}
          keyboardOffset={keyboardOffset}
          placeholder={placeholder}
          status={status}
        />
      )}

    </div>
  );
};
