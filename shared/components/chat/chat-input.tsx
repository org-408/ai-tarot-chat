import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  isFocused?: boolean;
  /** キーボード高さ (px)。Mobile: Capacitor Keyboard、Web: visualViewport から外部で計算して渡す */
  keyboardOffset?: number;
  disabled?: boolean;
  placeholder?: string;
  status?: "idle" | "streaming" | "error";
}

/**
 * チャット入力コンポーネント。
 * Capacitor 依存ゼロ。keyboardOffset は外部から注入。
 */
const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onKeyDown,
  onFocus,
  onBlur,
  textareaRef,
  isFocused = false,
  keyboardOffset = 0,
  disabled = false,
  placeholder = "メッセージを入力...",
  status = "idle",
}) => {
  const isFixed = isFocused && keyboardOffset > 0;

  return (
    <motion.div
      className={`px-4 py-3 bg-white border-t shadow ${
        isFixed ? "fixed bottom-0 left-0 right-0" : "relative"
      }`}
      animate={{ y: isFixed ? -keyboardOffset : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
    >
      <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_16px_rgba(0,0,0,0.06)]">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={2}
          className="w-full resize-none bg-transparent rounded-2xl px-4 py-3 pr-12 text-base text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
          style={{ maxHeight: "120px" }}
        />
        <button
          onClick={onSend}
          disabled={disabled || !value.trim() || status === "streaming"}
          className="absolute right-2 bottom-2 w-8 h-8 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-colors"
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  );
};

export default ChatInput;
