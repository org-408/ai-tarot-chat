import { motion, AnimatePresence } from "framer-motion";

export interface PurchaseLoadingOverlayLabels {
  /** タイトル。例: "プラン変更中" */
  title: string;
  /** 1 行目説明。例: "プランの切り替えを行っています" */
  line1: string;
  /** 2 行目説明（ハイライト）。例: "このままお待ちください" */
  line2: string;
}

interface PurchaseLoadingOverlayProps {
  labels: PurchaseLoadingOverlayLabels;
}

export const PurchaseLoadingOverlay: React.FC<PurchaseLoadingOverlayProps> = ({
  labels,
}) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center border border-purple-100/50 relative overflow-hidden"
        style={{ minWidth: "340px", maxWidth: "90vw" }}
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
          className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"
        />
        <div className="relative mb-5">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full blur-md"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="relative w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg"
          >
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v1a7 7 0 00-7 7h1z"
              />
            </svg>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="relative z-10"
        >
          <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            {labels.title}
          </div>
          <div className="text-sm text-gray-600 text-center leading-relaxed">
            {labels.line1}
            <br />
            <span className="text-purple-500 font-medium">{labels.line2}</span>
          </div>
        </motion.div>
        <div className="w-full h-1 bg-gray-200 rounded-full mt-6 overflow-hidden relative z-10">
          <motion.div
            animate={{ x: ["-100%", "300%"] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 rounded-full"
            style={{ width: "40%" }}
          />
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);
