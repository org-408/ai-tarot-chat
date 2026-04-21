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
      {/* 占い師肖像（折畳可） */}
      <motion.div
        className="flex-shrink-0 overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50"
        animate={{ height: isPortraitCollapsed ? 0 : "28vh" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="h-full p-3">
          <div className="h-full rounded-2xl overflow-hidden shadow-lg relative">
            <img
              src={tarotistImageUrl}
              alt={tarotistName}
              className="w-full h-full object-cover"
              style={{ objectPosition: "center 20%" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white">
              <p className="font-bold text-base">
                {tarotistIcon} {tarotistName}
              </p>
              {subtitle && (
                <p className="text-xs opacity-90">{subtitle}</p>
              )}
            </div>
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
        />
      </div>
    </div>
  );
}
