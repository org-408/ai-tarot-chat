"use client";

import { ChatView } from "@shared/components/chat/chat-view";
import type { UIMessage } from "ai";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

interface ChatColumnProps {
  tarotistImageUrl: string;
  tarotistName: string;
  tarotistIcon?: string;
  tarotistTitle?: string;
  tarotistTrait?: string;
  subtitle?: string;
  messages: UIMessage[];
  status: "idle" | "submitted" | "streaming" | "error";
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  inputDisabled: boolean;
  /** Phase2 鑑定中 / Q&A 中は true */
  isPhase2?: boolean;
  phase2Stage?: "chatting" | "saving" | "done";
  questionsRemaining?: number;
  isMessageComplete?: boolean;
  onEndReading?: () => void;
  error?: {
    message: string;
    retryable?: boolean;
    isInputError?: boolean;
  } | null;
  onRetry?: () => void;
  /** ChatView footer（Phase1 スプレッド選択 UI 等） */
  footer?: ReactNode;
  sessionEndedLabel?: string;
  sessionEndedSubLabel?: string;
  /** 上部の占い師肖像を初期表示するか（デフォルト true） */
  initialPortraitExpanded?: boolean;
}

/**
 * 左カラム。上部: 占い師肖像（折畳）、下部: ChatView。
 */
export function ChatColumn({
  tarotistImageUrl,
  tarotistName,
  tarotistIcon,
  tarotistTitle,
  tarotistTrait,
  subtitle,
  messages,
  status,
  inputValue,
  onInputChange,
  onSend,
  onKeyDown,
  inputDisabled,
  isPhase2,
  phase2Stage,
  questionsRemaining,
  isMessageComplete,
  onEndReading,
  error,
  onRetry,
  footer,
  sessionEndedLabel,
  sessionEndedSubLabel,
  initialPortraitExpanded = true,
}: ChatColumnProps) {
  const [isPortraitCollapsed, setIsPortraitCollapsed] = useState(
    !initialPortraitExpanded,
  );

  return (
    <div className="flex flex-col h-full">
      {/* 占い師肖像（折畳可）。モバイルの portrait 表示に寄せて、
          下部グラデーション上に名前・肩書き・特徴を配置する。 */}
      <motion.div
        className="flex-shrink-0 overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50"
        animate={{ height: isPortraitCollapsed ? 0 : "28vh" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="h-full w-full flex items-center justify-center relative">
          <img
            src={tarotistImageUrl}
            alt={tarotistName}
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 20%" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none" />
          <div className="absolute left-0 right-0 bottom-0 px-4 py-3 text-white pointer-events-none">
            <div className="flex items-center gap-2">
              {tarotistIcon && (
                <span className="text-2xl drop-shadow-lg">{tarotistIcon}</span>
              )}
              <span className="text-lg font-bold drop-shadow-lg">
                {tarotistName}
              </span>
            </div>
            {(tarotistTitle || subtitle) && (
              <p className="mt-1 text-xs font-medium text-white/90 drop-shadow-lg">
                {tarotistTitle ?? subtitle}
              </p>
            )}
            {tarotistTrait && (
              <p className="mt-0.5 text-xs text-white/80 drop-shadow-lg line-clamp-2">
                {tarotistTrait}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* 肖像折畳トグル */}
      <button
        type="button"
        onClick={() => setIsPortraitCollapsed((v) => !v)}
        className="flex-shrink-0 w-full h-7 flex items-center justify-center bg-white z-30"
      >
        <div className="bg-gray-200/80 rounded-full px-3 py-0.5 flex items-center">
          <motion.div
            animate={{ rotate: isPortraitCollapsed ? 0 : 180 }}
            transition={{ duration: 0.25 }}
          >
            <ChevronDown size={14} className="text-gray-500" />
          </motion.div>
        </div>
      </button>

      {/* ChatView */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <ChatView
          messages={messages}
          status={status}
          inputValue={inputValue}
          onInputChange={onInputChange}
          onSend={onSend}
          onKeyDown={onKeyDown}
          inputDisabled={inputDisabled}
          isPhase2={isPhase2}
          phase2Stage={phase2Stage}
          questionsRemaining={questionsRemaining}
          isMessageComplete={isMessageComplete}
          onEndReading={onEndReading}
          error={error}
          onRetry={onRetry}
          tarotistImageUrl={tarotistImageUrl}
          tarotistIcon={tarotistIcon}
          showAvatar={false}
          footer={footer}
          sessionEndedLabel={sessionEndedLabel}
          sessionEndedSubLabel={sessionEndedSubLabel}
          autoScrollMode="if-near-bottom"
        />
      </div>
    </div>
  );
}
