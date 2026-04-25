import { motion } from "framer-motion";

interface RevealPromptPanelProps {
  isAllRevealed?: boolean;
  onRevealAll: () => void;
}

/**
 * カードをめくるよう促すパネル。全カードめくり済みなら非表示。
 * プラットフォーム非依存 (useReading なし)。
 */
export const RevealPromptPanel: React.FC<RevealPromptPanelProps> = ({
  isAllRevealed = false,
  onRevealAll,
}) => {
  if (isAllRevealed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
      className="px-4 py-3 bg-transparent"
    >
      <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_16px_rgba(0,0,0,0.06)] px-4 py-4">
        <motion.div
          className="text-center mb-3"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
        >
          <p className="text-sm text-gray-600">
            全カードをめくって占い結果を確認しましょう！
          </p>
        </motion.div>
        <button
          type="button"
          onClick={onRevealAll}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold shadow-2xl hover:from-purple-600 hover:to-pink-600 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>✨ 一気にめくる ✨</span>
        </button>
      </div>
    </motion.div>
  );
};
