import type { PluginListenerHandle } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type {
  DrawnCard,
  Plan,
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../../shared/lib/types";
import { useChat } from "../lib/hooks/use-chat";
import { MessageContent } from "./message-content";
import { RevealPromptPanel } from "./reveal-prompt-panel";

interface ChatPanelProps {
  currentPlan: Plan;
  tarotist: Tarotist;
  spread: Spread;
  category: ReadingCategory;
  drawnCards: DrawnCard[];
  selectedCard?: DrawnCard | null;
  isRevealingComplete?: boolean;
  onRequestRevealAll?: () => void;
  onBack: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  currentPlan,
  tarotist,
  spread,
  category,
  drawnCards,
  isRevealingComplete,
  onRequestRevealAll,
  onBack,
}) => {
  // カスタムフック useChat を使用 - ストリーミングロジックを完全隠蔽
  const {
    messages,
    currentStreamingMessage,
    status,
    error,
    sendMessage,
    stopStreaming,
  } = useChat({
    tarotist,
    spread,
    category,
    drawnCards,
  });

  const [inputValue, setInputValue] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isKeyboardReady, setIsKeyboardReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // メッセージ変更時にログ出力（デバッグ用）
  useEffect(() => {
    console.log("Messages updated:", messages.length, "Status:", status);
  }, [messages, status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStreamingMessage]);

  // キーボード高さの検出
  useEffect(() => {
    let showListener: PluginListenerHandle | undefined;
    let hideListener: PluginListenerHandle | undefined;

    const setupCapacitorListeners = async () => {
      try {
        showListener = await Keyboard.addListener(
          "keyboardWillShow",
          (info) => {
            setKeyboardHeight(info.keyboardHeight);
            setIsKeyboardReady(true);
          }
        );

        hideListener = await Keyboard.addListener("keyboardWillHide", () => {
          setKeyboardHeight(0);
        });

        setIsKeyboardReady(true);
      } catch (listenerError) {
        console.log(
          "Capacitor Keyboard not available, using web fallback",
          listenerError
        );
        setIsKeyboardReady(true);
      }
    };

    setupCapacitorListeners();

    const handleResize = () => {
      if (window.visualViewport) {
        const offset = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(offset > 0 ? offset : 0);
        if (offset > 0) {
          setIsKeyboardReady(true);
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      const initialOffset = window.innerHeight - window.visualViewport.height;
      if (initialOffset > 0) {
        setKeyboardHeight(initialOffset);
        setIsKeyboardReady(true);
      }
    }

    return () => {
      showListener?.remove();
      hideListener?.remove();
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleSendMessage = useCallback(() => {
    if (inputValue.trim() && status !== "streaming") {
      sendMessage(inputValue.trim());
      setInputValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [inputValue, status, sendMessage]);

  const handleStopStreaming = useCallback(() => {
    stopStreaming();
  }, [stopStreaming]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    },
    []
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    const scrollDelay = isKeyboardReady ? 100 : 300;
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, scrollDelay);
  }, [isKeyboardReady]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  useEffect(() => {
    if (isRevealingComplete) {
      if (currentPlan.code !== "MASTER") {
        const prompt =
          "自己紹介と、カード解釈、最終的な占い結果を丁寧に教えてください。";
        sendMessage({ text: prompt });
      }
    }
  }, [currentPlan.code, isRevealingComplete, sendMessage]);

  // 戻るボタン関連
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showBackButton, setShowBackButton] = useState(false);

  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (!container) return;

    const handleScroll = () => {
      if (!isRevealingComplete) return;
      const isBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        10;
      setShowBackButton(isBottom);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [isRevealingComplete]);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-1/2 bg-white flex flex-col shadow-[0_-4px_12px_rgba(0,0,0,0.08),0_-2px_4px_rgba(0,0,0,0.04)]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map(
          (message: { id: string; role: string; content: string }) => (
            <div key={message.id}>
              {message.role === "user" ? (
                <div className="bg-gray-100 rounded-3xl px-4 py-3 inline-block max-w-[85%]">
                  <p className="text-base text-gray-900 whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              ) : (
                <MessageContent content={message.content} />
              )}
            </div>
          )
        )}

        {/* 現在ストリーミング中のメッセージ */}
        {status === "streaming" && currentStreamingMessage && (
          <div>
            <MessageContent content={currentStreamingMessage} />
          </div>
        )}

        {/* ローディングインジケーター */}
        {status === "streaming" && !currentStreamingMessage && (
          <div className="text-base text-gray-900">
            <div className="flex gap-1">
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 即答方式のパネル及びボタン表示 */}
      {currentPlan.code !== "MASTER" && (
        <RevealPromptPanel
          onRequestRevealAll={onRequestRevealAll}
          isAllRevealed={isRevealingComplete}
        />
      )}

      {/* Back Button */}
      {isRevealingComplete && (
        <motion.button
          key="back-button"
          initial={{ opacity: 0, scale: 0.7, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 40 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 right-6 z-50 bg-white/20 shadow-xl rounded-full px-5 py-3 text-purple-600 font-bold flex items-center gap-2"
          onClick={onBack}
        >
          <span>← 戻る</span>
        </motion.button>
      )}

      {/* Input Area */}
      {currentPlan.code === "MASTER" && (
        <motion.div
          className="px-4 py-3 bg-transparent border-1 shadow"
          animate={{
            y: isFocused && keyboardHeight > 0 ? -keyboardHeight : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
        >
          <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_16px_rgba(0,0,0,0.06)]">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="メッセージを入力..."
              rows={2}
              className="w-full resize-none bg-transparent rounded-2xl
              px-4 py-3 pr-12 text-base text-gray-900 placeholder-gray-400
              focus:outline-none transition-all"
              style={{ maxHeight: "120px" }}
              disabled={status === "streaming"}
            />
            {status === "streaming" ? (
              <button
                onClick={handleStopStreaming}
                className="absolute right-2 bottom-2 w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <span className="text-xs">■</span>
              </button>
            ) : (
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="absolute right-2 bottom-2 w-8 h-8 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
