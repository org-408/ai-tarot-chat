import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

type LowerViewerMode = "selector" | "personal";

interface LowerViewerProps {
  selectorContent: React.ReactNode;
  personalContent: React.ReactNode;
  defaultMode?: LowerViewerMode;
  onModeChange?: (mode: LowerViewerMode) => void;
  /** タブラベルをカスタマイズできる。省略時は "クイック占い" / "パーソナル占い" */
  selectorLabel?: string;
  personalLabel?: string;
}

export const LowerViewer: React.FC<LowerViewerProps> = ({
  selectorContent,
  personalContent,
  defaultMode = "selector",
  onModeChange,
  selectorLabel = "クイック占い",
  personalLabel = "パーソナル占い",
}) => {
  const [mode, setMode] = useState<LowerViewerMode>(defaultMode);

  const handleModeChange = (next: LowerViewerMode) => {
    setMode(next);
    onModeChange?.(next);
  };

  return (
    <div className="w-full h-full flex flex-col">
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
            {m === "selector" ? selectorLabel : personalLabel}
          </button>
        ))}
      </div>

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
