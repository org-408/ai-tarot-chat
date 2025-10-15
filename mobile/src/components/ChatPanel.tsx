import { useChat } from "@ai-sdk/react";
import type { PluginListenerHandle } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { DefaultChatTransport, type UIMessage } from "ai";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type {
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../../shared/lib/types";

interface CardPlacement {
  id: string;
  number: number;
  gridX: number;
  gridY: number;
  rotation: number;
  card: {
    id: string;
    name: string;
    uprightKeywords: string[];
    reversedKeywords: string[];
  };
  isReversed: boolean;
  position: string;
  description: string;
}

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
  const domain = import.meta.env.VITE_BFF_URL;

  const initialMessages: UIMessage[] = [
    {
      id: "ai-tarot-chat",
      role: "system",
      parts: [
        {
          type: "text",
          text:
            `あなたは、${tarotist.title}${tarotist.name}です。` +
            `あなたの特徴は${tarotist.trait}です。` +
            `あなたの性格・自己紹介は${tarotist.bio}です。` +
            `また、あなたは熟練したタロット占い師でもあります。` +
            `相談者が質問していない場合でも、` +
            `タロットカードの意味を踏まえた上で回答してください。` +
            `* 占いたいジャンルは${category.name}です。` +
            `* スプレッドは${spread.name}です。` +
            `* カードは以下の通りです。\n` +
            drawnCards
              .map(
                (placement) =>
                  `- ${placement.position}(${placement.card.name}${
                    placement.isReversed ? "逆位置" : "正位置"
                  }): ${
                    placement.isReversed
                      ? placement.card.reversedKeywords.join(", ")
                      : placement.card.uprightKeywords.join(", ")
                  }`
              )
              .join("\n")
              .trim() +
            `\n\n` +
            `【フォーマット】\n` +
            `- 全てのカードの解釈を丁寧にしてください\n` +
            `- カードの解釈を総合的に判断して、最終的な占い結果を概要と詳細説明に分けて丁寧に説明してください。\n` +
            `- 相談者が質問していない場合でも、タロットカードの意味を踏まえた上で回答すること\n` +
            `- 相談者に寄り添い、優しく丁寧に説明すること\n` +
            `- です・ます調で話すこと\n` +
            `- 絵文字や顔文字は使わないこと\n` +
            `- 1回の回答は200文字以上300文字以内とすること\n` +
            `\n` +
            `【制約条件】\n` +
            `- タロットカードの意味に基づいて回答すること\n` +
            `- 相談者の質問に対して、タロットカードの意味を踏まえた上で回答すること\n` +
            `- 相談者が質問していない場合でも、タロットカードの意味を踏まえた上で回答すること\n` +
            `- 占いの結果は必ずしも現実になるとは限らないことを理解してもらうようにすること\n` +
            `- 相談者のプライバシーを尊重し、個人情報を尋ねたり共有したりしないこと\n` +
            `- 医療、法律、財務などの専門的なアドバイスを提供しないこと\n` +
            `- 相談者が不快に感じるような話題や言葉遣いを避けること\n` +
            `- 絵文字や顔文字を使わないこと\n` +
            `- 相談者に寄り添い、優しく丁寧に説明すること\n` +
            `- です・ます調で話すこと\n` +
            `- 1回の回答は200文字以上300文字以内とすること\n`,
        },
      ],
    },
  ];

  const { messages, sendMessage, status } = useChat({
    id: "ai-tarot-chat",
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: `${domain}/api/chat`,

      // リクエストをカスタマイズ
      // prepareSendMessagesRequest: ({ messages, id }) => {
      //   // 初回（messagesが1件＝ユーザーの最初の入力のみ）の場合
      //   let modelMessages = convertToModelMessages(messages);

      //   if (modelMessages.length === 1) {
      //     modelMessages = [
      //       {
      //         role: "system",
      //         content:
      //           `あなたは熟練したタロット占い師です。` +
      //           `以下の制約条件と入力文をもとに、` +
      //           `タロットカードのリーディングを行い、` +
      //           `相談者にわかりやすく丁寧に説明してください。` +
      //           `相談者の質問に対して、` +
      //           `タロットカードの意味を踏まえた上で回答してください。` +
      //           `相談者が質問していない場合でも、` +
      //           `タロットカードの意味を踏まえた上で回答してください。` +
      //           `* あなたは、${tarotist.title}${tarotist.name}です。` +
      //           `* 占いたいジャンルは${category.name}です。` +
      //           `* スプレッドは${spread.name}です。` +
      //           `* カードは以下の通りです。\n` +
      //           drawnCards
      //             .map(
      //               (placement) =>
      //                 `- ${placement.position}(${placement.card.name}${
      //                   placement.isReversed ? "逆位置" : "正位置"
      //                 }): ${
      //                   placement.isReversed
      //                     ? placement.card.reversedKeywords.join(", ")
      //                     : placement.card.uprightKeywords.join(", ")
      //                 }`
      //             )
      //             .join("\n")
      //             .trim() +
      //           `\n\n` +
      //           `【フォーマット】\n` +
      //           `- 箇条書きでわかりやすく説明すること\n` +
      //           `- 相談者の質問に対して、タロットカードの意味を踏まえた上で回答すること\n` +
      //           `- 相談者が質問していない場合でも、タロットカードの意味を踏まえた上で回答すること\n` +
      //           `- 相談者に寄り添い、優しく丁寧に説明すること\n` +
      //           `- です・ます調で話すこと\n` +
      //           `- 絵文字や顔文字は使わないこと\n` +
      //           `- 1回の回答は200文字以上300文字以内とすること\n` +
      //           `- 回答の最後に「他に知りたいことはありますか?」と付け加えること\n` +
      //           `\n` +
      //           `【制約条件】\n` +
      //           `- タロットカードの意味に基づいて回答すること\n` +
      //           `- 相談者の質問に対して、タロットカードの意味を踏まえた上で回答すること\n` +
      //           `- 相談者が質問していない場合でも、タロットカードの意味を踏まえた上で回答すること\n` +
      //           `- 占いの結果は必ずしも現実になるとは限らないことを理解してもらうようにすること\n` +
      //           `- 相談者のプライバシーを尊重し、個人情報を尋ねたり共有したりしないこと\n` +
      //           `- 医療、法律、財務などの専門的なアドバイスを提供しないこと\n` +
      //           `- 相談者が不快に感じるような話題や言葉遣いを避けること\n` +
      //           `- 絵文字や顔文字を使わないこと\n` +
      //           `- 相談者に寄り添い、優しく丁寧に説明すること\n` +
      //           `- です・ます調で話すこと\n` +
      //           `- 1回の回答は200文字以上300文字以内とすること\n` +
      //           `- 回答の最後に「他に知りたいことはありますか?」と付け加えること\n`,
      //       },
      //       ...modelMessages,
      //     ];
      //   }

      //   return {
      //     body: {
      //       id,
      //       messages: modelMessages,
      //       tarotist,
      //       spread,
      //       category,
      //     },
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //   };
      // },
    }),
    onError: (err) => {
      console.error("Chat error:", err);
    },
  });

  const [inputValue, setInputValue] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // キーボード高さの検出
  useEffect(() => {
    let showListener: PluginListenerHandle | undefined;
    let hideListener: PluginListenerHandle | undefined;

    const setupListeners = async () => {
      // Capacitor Keyboard API（ネイティブ環境）
      try {
        showListener = await Keyboard.addListener(
          "keyboardWillShow",
          (info) => {
            setKeyboardHeight(info.keyboardHeight);
          }
        );

        hideListener = await Keyboard.addListener("keyboardWillHide", () => {
          setKeyboardHeight(0);
        });
      } catch (error) {
        // Capacitor が利用できない環境（Web）ではエラーを無視
        console.log(
          "Capacitor Keyboard not available, using web fallback",
          error
        );
      }
    };

    setupListeners();

    // Web環境のフォールバック（visualViewport）
    const handleResize = () => {
      if (window.visualViewport) {
        const offset = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(offset > 0 ? offset : 0);
      }
    };

    window.visualViewport?.addEventListener("resize", handleResize);

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
    // キーボードアニメーション後にメッセージを最下部にスクロール
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 300);
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
        className="px-4 py-3 bg-transparent"
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
            className="w-full resize-none bg-transparent border-0 rounded-2xl px-4 py-3 pr-12 text-base text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
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
