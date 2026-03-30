import { useChat } from "@ai-sdk/react";
import type { PluginListenerHandle } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/hooks/use-auth";
import { useClient } from "../lib/hooks/use-client";
import { useMaster } from "../lib/hooks/use-master";
import { useSalon } from "../lib/hooks/use-salon";
import CategorySpreadSelector from "./category-spread-selector";
import { MessageContent } from "./message-content";
import { RevealPromptPanel } from "./reveal-prompt-panel";

/**
 * NOTE: useChat の API 定義を安定させるため、 key= を利用して、確実にアンマウント、マウントさせること
 */

interface ChatPanelProps {
  onKeyboardHeightChange?: React.Dispatch<React.SetStateAction<number>>;
  handleStartReading?: () => void;
  onBack: () => void;
  /** Phase1 の会話履歴を Phase2 の初期メッセージとして渡す */
  initialMessages?: UIMessage[];
  /** messages が変わるたびに呼ばれるコールバック（Phase1 → Phase2 への引き継ぎ用） */
  onMessagesChange?: (messages: UIMessage[]) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  onKeyboardHeightChange,
  handleStartReading,
  onBack,
  initialMessages,
  onMessagesChange,
}) => {
  const domain = import.meta.env.VITE_BFF_URL;

  const { token } = useAuth();

  const { saveReading } = useClient();
  const [isSavingReading, setIsSavingReading] = useState(false);

  const {
    selectedTarotist: tarotist,
    selectedCategory: category,
    selectedSpread: spread,
    drawnCards,
    isRevealingCompleted,
    isPersonal,
    customQuestion,
    setCustomQuestion,
    setSelectedSpread,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setMessages,
  } = useSalon();

  const { masterData } = useMaster();

  // Phase2: パーソナル占いの Phase1 会話履歴が渡されている場合
  const isPhase2 = isPersonal && (initialMessages?.length ?? 0) > 0;
  const initialLen = initialMessages?.length ?? 0;
  const MAX_PHASE2_QUESTIONS = 3;

  const [inputDisabled, setInputDisabled] = useState(false);

  const { messages, sendMessage, status, stop } = useChat({
    ...(initialMessages && { messages: initialMessages }),
    transport: new DefaultChatTransport({
      api: !isPersonal
        ? `${domain}/api/readings/simple`
        : `${domain}/api/readings/personal`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    onFinish: (message) => {
      console.log("Chat finished:", message);
    },
  });

  const hasSentInitialMessage = useRef(false);

  const [inputValue, setInputValue] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [, setIsFocused] = useState(false);
  const [, setIsKeyboardReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasSaved = useRef(false);
  const [isMessageComplete, setIsMessageComplete] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  // デバッグ用: messagesの変更を監視
  useEffect(() => {
    // console.log("Messages updated:", messages.length, "Status:", status);
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.log("Last message:", lastMessage);
      if (!isPhase2) {
        // Phase1: スプレッド選択後（messages[3] でスプレッド確定）は入力停止
        setInputDisabled(messages.length > 3);
      } else {
        // Phase2: autoメッセージ以降のユーザー発言数で判定
        const phase2UserCount = messages.filter(
          (m, i) => m.role === "user" && i > initialLen
        ).length;
        setInputDisabled(phase2UserCount >= MAX_PHASE2_QUESTIONS);
      }
      // パーソナル占い Phase1 のスプレッド選択（Phase2 では不要）
      if (isPersonal && !isPhase2 && status === "ready") {
        if (messages.length === 4) {
          console.log("step 2 reached in spread select mode");
          // スプレッドを messsages から取得してセット
          const str = messages[3].parts
            .filter((part) => part.type === "text")
            .map((part) => (part as { text: string }).text)
            .join("");
          console.log("Extracted string:", str);
          const match = str.match(/\{(\d+)\}:\s*\{([^}]+)\}/);
          const spreadNo = match ? parseInt(match[1], 10) : undefined;
          const spreadName = match ? match[2] : "";
          console.log("Extracted spread no, name:", spreadNo, spreadName);
          const spread = masterData.spreads.find(
            (s) => s.no === spreadNo || s.name === spreadName,
          );
          console.log("Found spread:", spread);
          if (spread) {
            setSelectedSpread(spread);
          }
          // もし spread が取得できなくても、そのまま進める
          setShowSelector(true);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPersonal, masterData.spreads, messages, status]);

  useEffect(() => {
    // isPersonal が切り替わったらメッセージをストップ
    if (!isPersonal) {
      stop();
    }
  }, [isPersonal, stop]);

  // 新しいメッセージが追加されたら自動スクロール -> コメントアウトしてスクロールさせないように変更
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [messages]);

  // キーボード高さの検出 - マウント時に即座にセットアップ
  useEffect(() => {
    let showListener: PluginListenerHandle | undefined;
    let hideListener: PluginListenerHandle | undefined;

    // Capacitor Keyboard API(ネイティブ環境)
    const setupCapacitorListeners = async () => {
      try {
        showListener = await Keyboard.addListener(
          "keyboardWillShow",
          (info) => {
            setKeyboardHeight(info.keyboardHeight);
            setIsKeyboardReady(true);
          },
        );

        hideListener = await Keyboard.addListener("keyboardWillHide", () => {
          setKeyboardHeight(0);
        });

        // リスナー登録完了
        setIsKeyboardReady(true);
      } catch (error) {
        // Capacitor が利用できない環境(Web)ではフォールバックを使用
        console.log(
          "Capacitor Keyboard not available, using web fallback",
          error,
        );
        setIsKeyboardReady(true); // Web環境でも準備完了とする
      }
    };

    // 即座にセットアップ開始
    setupCapacitorListeners();

    // Web環境のフォールバック(visualViewport)
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
    if (messages.length < 3) {
      console.log("step 2 not reached yet, setting custom question");
      setCustomQuestion(inputValue.trim());
    }
    console.log("Sending message:", inputValue);
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
    setInputValue(inputValue.trim());

    // キーボードの準備ができている場合は即座にスクロール
    // そうでない場合は少し待つ
    // const scrollDelay = isKeyboardReady ? 100 : 300;

    // setTimeout(() => {
    //   textareaRef.current?.scrollIntoView({ behavior: "smooth" });
    // }, scrollDelay);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  useEffect(() => {
    onKeyboardHeightChange?.(keyboardHeight);
  }, [keyboardHeight, onKeyboardHeightChange]);

  // Phase1 メッセージを親に通知（Phase2 の初期メッセージとして使う）
  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  // 初回メッセージ送信（Phase1: あいさつ / Phase2: 占い開始）
  useEffect(() => {
    if (hasSentInitialMessage.current) return;
    if (!isPhase2 && (isRevealingCompleted || isPersonal)) {
      hasSentInitialMessage.current = true;
      sendMessage({ text: "よろしくお願いします。" });
    } else if (isPhase2 && drawnCards.length > 0) {
      hasSentInitialMessage.current = true;
      sendMessage({ text: "では、占いを始めてください。" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPersonal, isRevealingCompleted, isPhase2, drawnCards.length]);

  // 戻るボタン関連
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showBackButton, setShowBackButton] = useState(false);

  // スクロールが一番下か判定;
  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (!container) return;

    const handleScroll = () => {
      if (!isRevealingCompleted) return;
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
  }, [isRevealingCompleted]);

  useEffect(() => {
    console.log(
      "isRevealingCompleted or messages or status changed:",
      isRevealingCompleted,
      messages,
      status,
    );
    // isPersonal の場合はカードめくり不要なので drawnCards.length > 0 (Phase2) で判定
    // 通常占いは isRevealingCompleted が true になったタイミングで保存
    const shouldSave =
      (isRevealingCompleted || isPersonal) &&
      drawnCards.length > 0 &&
      messages.length > 0 &&
      status === "ready" &&
      (!isPhase2 || messages.length > (initialMessages?.length ?? 0));

    if (shouldSave && !hasSaved.current) {
      hasSaved.current = true;
      setIsMessageComplete(true);
      setIsSavingReading(true);
      saveReading({
        tarotistId: tarotist.id,
        tarotist,
        spreadId: spread.id,
        spread,
        category: isPersonal ? undefined : category,
        customQuestion: isPersonal ? customQuestion : undefined,
        cards: drawnCards,
        chatMessages: messages.map((msg) => ({
          tarotistId: tarotist.id,
          tarotist,
          chatType: msg.role === "user" ? "USER_QUESTION" : "FINAL_READING",
          role: msg.role === "user" ? "USER" : "TAROTIST",
          message: msg.parts
            .filter((part) => part.type === "text")
            .map((part) => (part as { text: string }).text)
            .join(""),
        })),
      }).finally(() => setIsSavingReading(false));
    }
  }, [
    category,
    customQuestion,
    drawnCards,
    isPersonal,
    isRevealingCompleted,
    messages,
    saveReading,
    spread,
    status,
    tarotist,
  ]);

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white px-4 py-6 space-y-6 pb-26">
        {messages.map((message, index) => {
          const textContent = message.parts
            .filter((part) => part.type === "text")
            .map((part) => (part as { text: string }).text)
            .join("");
          console.log("Rendering message:", { index, message, textContent });

          return (
            <div key={index}>
              {message.role === "user" ? (
                <div className="bg-gray-100 rounded-3xl px-4 py-3 inline-block max-w-[85%]">
                  <p className="text-base text-gray-900 whitespace-pre-wrap">
                    {textContent}
                  </p>
                </div>
              ) : (
                <MessageContent content={textContent} />
              )}
            </div>
          );
        })}

        {(status === "submitted" ||
          status === "streaming" ||
          isSavingReading) && (
          <div className="text-base text-gray-900">
            <div className="flex gap-1">
              <div
                className="w-4 h-4 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-4 h-4 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-4 h-4 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}

        {/* スプレッド選択画面を表示 */}
        {showSelector && handleStartReading && isPersonal && (
          <div className="mt-6">
            <CategorySpreadSelector handleStartReading={handleStartReading} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 即答方式のヒント及びボタン表示 */}
      {!isPersonal && (
        <RevealPromptPanel isAllRevealed={isRevealingCompleted} />
      )}

      {/* Back Button - saveReading 完了後に表示（Phase2 では全質問終了後のみ） */}
      {isMessageComplete && !isSavingReading && (!isPhase2 || inputDisabled) && (
        <motion.button
          key={"back-button"}
          initial={{ opacity: 0, scale: 0.7, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 40 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute bottom-6 right-6 z-50 bg-white/20 shadow-xl rounded-full px-5 py-3 text-purple-600 font-bold flex items-center gap-2"
          onClick={onBack}
        >
          <span>← 戻る</span>
        </motion.button>
      )}

      {/* Phase2: セッション終了メッセージ */}
      {isPhase2 && inputDisabled && isMessageComplete && (
        <div className="px-4 py-3 text-center text-xs text-gray-400">
          本日のセッションはここまでとなります 🔮
        </div>
      )}

      {/* Input Area - motion.divでキーボードの上に滑らかに移動 */}
      {isPersonal && !inputDisabled && (
        <motion.div
          className={`px-4 py-3 bg-transparent border-1 shadow${showSelector ? " invisible" : ""}`}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
        >
          {/* Phase2: 残り問数バッジ */}
          {isPhase2 && (() => {
            const phase2UserCount = messages.filter(
              (m, i) => m.role === "user" && i > initialLen
            ).length;
            const remaining = MAX_PHASE2_QUESTIONS - phase2UserCount;
            return (
              <div className="text-center text-xs text-purple-400 mb-1">
                ✦ 残り{remaining}問
              </div>
            );
          })()}

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
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || status === "streaming"}
              className="absolute right-2 bottom-2 w-8 h-8 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
