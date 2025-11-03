import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  inputValue: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSendMessage: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  isFocused: boolean;
  handleFocus: () => void;
  handleBlur: () => void;
  keyboardHeight: number;
  status: "idle" | "streaming" | "error";
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  handleInputChange,
  handleSendMessage,
  handleKeyDown,
  textareaRef,
  isFocused,
  handleFocus,
  handleBlur,
  keyboardHeight,
  status,
}) => {
  return (
    <motion.div
      className={`px-4 py-3 bg-white border-t shadow ${
        isFocused && keyboardHeight > 0
          ? "fixed bottom-0 left-0 right-0"
          : "relative"
      }`}
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
  );
};

export default ChatInput;
