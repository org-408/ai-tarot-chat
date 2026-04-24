import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ChatMessage, ReadingCategory, Spread } from "../../../shared/lib/types";
import { MessageContent } from "./message-content";

interface HistoryPanelProps {
  messages: ChatMessage[];
  category?: ReadingCategory | null;
  spread?: Spread | null;
  customQuestion?: string | null;
  createdAt?: string | Date | null;
  onClose: () => void;
}

/**
 * 履歴詳細のチャット画面上部に出すタイムスタンプ。
 * UI 言語に合わせて日時フォーマットを切り替える。
 *   JA: "2026年4月24日 15:30"
 *   EN: "Apr 24, 2026, 3:30 PM"
 */
function formatReadingDate(date: string | Date, lang: string): string {
  const d = date instanceof Date ? date : new Date(date);
  const locale = lang === "ja" ? "ja-JP" : "en-US";
  return d.toLocaleString(locale, {
    year: "numeric",
    month: lang === "ja" ? "long" : "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  messages,
  category,
  spread,
  customQuestion,
  createdAt,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* メッセージエリア */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white px-4 py-4 space-y-6 pb-24">
        {/* 日時スタンプ */}
        {createdAt && (
          <div className="flex justify-center">
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              {formatReadingDate(createdAt, i18n.language)}
            </span>
          </div>
        )}

        {/* 占い情報バッジ */}
        {(category || spread || customQuestion) && (
          <div className="space-y-2">
            {customQuestion ? (
              <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2.5">
                <p className="text-xs text-purple-500 font-medium mb-1">
                  {t("history.yourQuestion")}
                </p>
                <p className="text-xs text-gray-700 leading-relaxed">{customQuestion}</p>
              </div>
            ) : (
              <>
                {category && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">
                      {t("reading.readingContent")}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                      {category.name}
                    </span>
                  </div>
                )}
                {spread && (
                  <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs text-purple-500 font-medium">
                        {t("reading.spreadLabel")}
                      </span>
                      <span className="text-xs font-bold text-purple-800">{spread.name}</span>
                    </div>
                    {spread.guide && (
                      <p className="text-xs text-gray-600 leading-relaxed">{spread.guide}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* メッセージ一覧 */}
        {messages.map((msg, i) => (
          <div
            key={msg.id ?? i}
            className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "USER" ? (
              <div className="bg-gray-100 rounded-3xl px-4 py-3 inline-block max-w-[85%]">
                <p className="text-base text-gray-900 whitespace-pre-wrap">{msg.message}</p>
              </div>
            ) : (
              <div className="max-w-[92%]">
                <MessageContent content={msg.message} />
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* 閉じるボタン（右上固定） */}
      <motion.button
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
        className="absolute top-3 right-3 z-50 w-9 h-9 bg-white/80 shadow-md rounded-full flex items-center justify-center"
        onClick={onClose}
      >
        <X size={18} className="text-gray-500" />
      </motion.button>
    </div>
  );
};
