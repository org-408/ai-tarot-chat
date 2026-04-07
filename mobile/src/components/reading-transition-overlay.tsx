import { motion } from "framer-motion";

interface ReadingTransitionOverlayProps {
  message?: string;
}

const ReadingTransitionOverlay: React.FC<ReadingTransitionOverlayProps> = ({
  message = "占いの準備をしています...",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[180] flex items-center justify-center bg-[linear-gradient(135deg,#8b9def_0%,#9d7bc2_100%)]"
    >
      <div className="mx-6 w-full max-w-sm rounded-3xl border border-white/30 bg-white/18 px-8 py-10 text-center text-white shadow-2xl backdrop-blur-xl">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white/18 shadow-lg"
        >
          <div className="h-6 w-6 rounded-full border-2 border-white/40 border-t-white" />
        </motion.div>
        <p className="text-lg font-bold tracking-wide">AI Tarot Chat</p>
        <p className="mt-2 text-sm text-white/85">{message}</p>
      </div>
    </motion.div>
  );
};

export default ReadingTransitionOverlay;
