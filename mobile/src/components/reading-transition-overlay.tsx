import { motion } from "framer-motion";

const ReadingTransitionOverlay: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-[180] overflow-hidden bg-[linear-gradient(135deg,#8b9def_0%,#9d7bc2_100%)]"
    >
      <motion.div
        animate={{ opacity: [0.18, 0.28, 0.18] }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="absolute inset-0 bg-white/10 backdrop-blur-sm"
      />
      <div className="absolute -top-24 right-[-72px] h-56 w-56 rounded-full bg-white/18 blur-3xl" />
      <div className="absolute bottom-[-88px] left-[-56px] h-52 w-52 rounded-full bg-indigo-200/25 blur-3xl" />
      <motion.div
        initial={{ scale: 0.96, opacity: 0.85 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
        className="absolute inset-0"
      />
      <div className="absolute inset-x-0 bottom-10 flex justify-center">
        <motion.div
          animate={{ opacity: [0.2, 0.45, 0.2], scale: [0.98, 1, 0.98] }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="h-1.5 w-20 rounded-full bg-white/45 shadow-[0_0_18px_rgba(255,255,255,0.3)]"
        >
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ReadingTransitionOverlay;
