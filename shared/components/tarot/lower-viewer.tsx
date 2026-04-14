import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

type LowerViewerMode = "selector" | "personal";

interface LowerViewerProps {
  /** クイック占い選択画面 */
  selectorContent: React.ReactNode;
  /** パーソナル占いチャット画面 */
  personalContent: React.ReactNode;
  /** 初期モード。デフォルト: "selector" */
  defaultMode?: LowerViewerMode;
  /** モード変化時のコールバック */
  onModeChange?: (mode: LowerViewerMode) => void;
}

/**
 * クイック占い / パーソナル占いの切替エリア。
 * プラットフォーム非依存 (embla 不使用)。
 * モバイルではスワイプ、Web ではタブボタンで切替。
 */
export const LowerViewer: React.FC<LowerViewerProps> = ({
  selectorContent,
  personalContent,
  defaultMode = "selector",
  onModeChange,
}) => {
  const [mode, setMode] = useState<LowerViewerMode>(defaultMode);

  const handleModeChange = (next: LowerViewerMode) => {
    setMode(next);
    onModeChange?.(next);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* タブ切替ボタン */}
      <div className="w-full flex justify-center gap-3 p-1 bg-white border-b border-purple-100">
        {(["selector", "personal"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className={`w-28 h-7 text-xs rounded-full transition-all ${
              mode === m
                ? "bg-purple-400/70 text-white font-semibold"
                : "bg-purple-100/60 text-purple-700"
            }`}
          >
            {m === "selector" ? "クイック占い" : "パーソナル占い"}
          </button>
        ))}
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 min-h-0 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          {mode === "selector" && (
            <motion.div
              key="selector"
              className="w-full h-full"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {selectorContent}
            </motion.div>
          )}
          {mode === "personal" && (
            <motion.div
              key="personal"
              className="w-full h-full"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {personalContent}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
