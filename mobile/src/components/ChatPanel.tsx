import { useChat } from "@ai-sdk/react";
import type { PluginListenerHandle } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { DefaultChatTransport } from "ai";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type {
  CardPlacement,
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../../shared/lib/types";

interface ChatPanelProps {
  tarotist: Tarotist;
  spread: Spread;
  category: ReadingCategory;
  drawnCards: CardPlacement[];
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  tarotist,
  spread,
  category,
  drawnCards,
}) => {
  console.log("ChatPanel rendered with:", {
    tarotist,
    spread,
    category,
    drawnCards,
  });
  const domain = import.meta.env.VITE_BFF_URL;

  const { messages, sendMessage, status } = useChat({
    id: "ai-tarot-chat",
    transport: new DefaultChatTransport({
      api: `${domain}/api/chat`,
      body: {
        tarotist,
        spread,
        category,
        drawnCards,
      },
    }),
    onError: (err) => {
      console.error("Chat error:", err);
    },
  });

  const [inputValue, setInputValue] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isKeyboardReady, setIsKeyboardReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // キーボード高さの検出 - マウント時に即座にセットアップ
  useEffect(() => {
    let showListener: PluginListenerHandle | undefined;
    let hideListener: PluginListenerHandle | undefined;

    // Capacitor Keyboard API（ネイティブ環境）
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

        // リスナー登録完了
        setIsKeyboardReady(true);
      } catch (error) {
        // Capacitor が利用できない環境（Web）ではフォールバックを使用
        console.log(
          "Capacitor Keyboard not available, using web fallback",
          error
        );
        setIsKeyboardReady(true); // Web環境でも準備完了とする
      }
    };

    // 即座にセットアップ開始
    setupCapacitorListeners();

    // Web環境のフォールバック（visualViewport）
    const handleResize = () => {
      if (window.visualViewport) {
        const offset = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(offset > 0 ? offset : 0);
        if (offset > 0) {
          setIsKeyboardReady(true);
        }
      }
    };

    // visualViewportも即座に登録
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      // 初回チェック
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

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      sendMessage({ text: inputValue.trim() });
      setInputValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleFocus = () => {
    setIsFocused(true);

    // キーボードの準備ができている場合は即座にスクロール
    // そうでない場合は少し待つ
    const scrollDelay = isKeyboardReady ? 100 : 300;

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, scrollDelay);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-1/2 bg-white flex flex-col shadow-[0_-4px_12px_rgba(0,0,0,0.08),0_-2px_4px_rgba(0,0,0,0.04)]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((message, index) => (
          <div key={index}>
            {message.role === "user" ? (
              <div className="bg-gray-100 rounded-3xl px-4 py-3 inline-block max-w-[85%]">
                <p className="text-base text-gray-900 whitespace-pre-wrap">
                  {message.parts.map((part) =>
                    part.type === "text" ? part.text : null
                  )}
                </p>
              </div>
            ) : (
              <div className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                {message.parts.map((part) =>
                  part.type === "text" ? part.text : null
                )}
              </div>
            )}
          </div>
        ))}

        {status === "streaming" && (
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

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - motion.divでキーボードの上に滑らかに移動 */}
      <motion.div
        className="px-4 py-3 bg-transparent　border-1 shadow"
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
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || status === "streaming"}
            className="absolute right-2 bottom-2 w-8 h-8 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
