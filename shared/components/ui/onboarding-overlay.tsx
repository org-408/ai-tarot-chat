import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

export interface OnboardingOverlayProps {
  /** 表示制御。false なら何も描画しない */
  isOpen: boolean;
  /** タイトル（大きめ・メイン文言） */
  title: string;
  /** 注意書き（小さい文字） */
  note?: string;
  /** 画面タップで閉じた時のコールバック */
  onDismiss: () => void;
  /** 画面タップで閉じる前の自動クローズまでの時間(ms)。指定時は自動で dismiss する */
  autoDismissMs?: number;
}

/**
 * 初回チュートリアル用オーバーレイ
 *
 * 仕様:
 * - 画面全体に薄暗いバックグラウンド (bg-black/40)
 * - 中央に文言を配置（カードっぽいパネル）
 * - 画面のどこをタップしても `onDismiss` が呼ばれる
 * - `framer-motion` でフェード＋スケールアニメーション
 */
export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  isOpen,
  title,
  note,
  onDismiss,
  autoDismissMs,
}) => {
  useEffect(() => {
    if (!isOpen || !autoDismissMs) return;
    const t = setTimeout(() => onDismiss(), autoDismissMs);
    return () => clearTimeout(t);
  }, [isOpen, autoDismissMs, onDismiss]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onDismiss}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-6"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative max-w-sm w-full rounded-2xl bg-white/95 shadow-2xl px-6 py-5 text-center"
          >
            <p className="text-gray-900 text-base font-semibold leading-relaxed whitespace-pre-line">
              {title}
            </p>
            {note && (
              <p className="text-gray-500 text-xs mt-3 leading-relaxed whitespace-pre-line">
                {note}
              </p>
            )}
            <p className="mt-4 text-[11px] text-purple-500 tracking-wide">
              画面をタップして閉じる
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingOverlay;
