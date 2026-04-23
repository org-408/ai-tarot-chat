import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useState } from "react";

export interface SpotlightCoachMarkProps {
  /** 表示制御 */
  isOpen: boolean;
  /** スポットライトを当てる対象要素。null なら表示しない */
  targetEl: HTMLElement | null;
  /** 吹き出しのメインメッセージ */
  title: string;
  /** 補足説明（小さい文字） */
  note?: string;
  /** 画面タップで閉じた時のコールバック */
  onDismiss: () => void;
  /** isOpen=true から実際の表示開始までの遅延 (ms)。穏やかな登場用 */
  openDelayMs?: number;
  /**
   * フェードイン中は pointer-events を無効化する時間 (ms)。
   * スクロール中の touchend による誤 dismiss を防ぐ保険。
   */
  pointerActivationDelayMs?: number;
  /** ハイライト矩形のパディング (px) */
  spotlightPadding?: number;
  /** ハイライト矩形の角丸 (px) */
  spotlightRadius?: number;
}

const BUBBLE_MAX_WIDTH = 280;
const BUBBLE_MARGIN = 12;
const VIEWPORT_MARGIN = 16;

/**
 * スポットライト型コーチマーク。
 *
 * 対象要素の周りを視覚的に切り抜き（`box-shadow` トリック）、
 * 近傍に吹き出しメッセージを出す。画面タップで閉じる。
 *
 * スクロール中の誤 dismiss 対策として、表示直後は dismiss 用の pointer events を
 * 無効化する（`pointerActivationDelayMs`）。
 */
export const SpotlightCoachMark: React.FC<SpotlightCoachMarkProps> = ({
  isOpen,
  targetEl,
  title,
  note,
  onDismiss,
  openDelayMs = 0,
  pointerActivationDelayMs = 300,
  spotlightPadding = 8,
  spotlightRadius = 12,
}) => {
  const [visible, setVisible] = useState(false);
  const [pointerActive, setPointerActive] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // isOpen → openDelayMs 後に表示
  useEffect(() => {
    if (!isOpen) {
      setVisible(false);
      setPointerActive(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), openDelayMs);
    return () => clearTimeout(t);
  }, [isOpen, openDelayMs]);

  // 表示後 pointerActivationDelayMs 経過でタップ受付開始
  useEffect(() => {
    if (!visible) {
      setPointerActive(false);
      return;
    }
    const t = setTimeout(() => setPointerActive(true), pointerActivationDelayMs);
    return () => clearTimeout(t);
  }, [visible, pointerActivationDelayMs]);

  // ターゲットの矩形を追従（scroll / resize）
  useLayoutEffect(() => {
    if (!visible || !targetEl) return;
    const update = () => setRect(targetEl.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, { capture: true });
    };
  }, [visible, targetEl]);

  // 吹き出し配置: 対象の中心が画面上半分なら下側に、下半分なら上側に出す
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 360;
  const targetCenterY = rect ? rect.top + rect.height / 2 : 0;
  const placeBelow = targetCenterY < viewportH / 2;

  const bubbleLeft = rect
    ? Math.max(
        VIEWPORT_MARGIN,
        Math.min(
          viewportW - BUBBLE_MAX_WIDTH - VIEWPORT_MARGIN,
          rect.left + rect.width / 2 - BUBBLE_MAX_WIDTH / 2
        )
      )
    : 0;

  const bubblePositionStyle: React.CSSProperties = rect
    ? placeBelow
      ? { top: rect.bottom + spotlightPadding + BUBBLE_MARGIN, left: bubbleLeft }
      : {
          bottom:
            viewportH - rect.top + spotlightPadding + BUBBLE_MARGIN,
          left: bubbleLeft,
        }
    : {};

  return (
    <AnimatePresence>
      {visible && targetEl && rect && (
        <>
          {/* 画面全体のタップキャッチャー（フェード中は pointer-events: none） */}
          <motion.div
            key="catcher"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[999]"
            style={{ pointerEvents: pointerActive ? "auto" : "none" }}
            onClick={onDismiss}
            role="dialog"
            aria-modal="true"
          />

          {/* 切り抜き（visual のみ、pointer-events は通さない） */}
          <motion.div
            key="spotlight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            aria-hidden="true"
            className="fixed pointer-events-none z-[1000]"
            style={{
              top: rect.top - spotlightPadding,
              left: rect.left - spotlightPadding,
              width: rect.width + spotlightPadding * 2,
              height: rect.height + spotlightPadding * 2,
              borderRadius: spotlightRadius,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
            }}
          />

          {/* 吹き出し */}
          <motion.div
            key="bubble"
            initial={{ opacity: 0, scale: 0.95, y: placeBelow ? -8 : 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="fixed z-[1001] px-5 py-4 rounded-2xl bg-white shadow-2xl pointer-events-none"
            style={{
              ...bubblePositionStyle,
              maxWidth: BUBBLE_MAX_WIDTH,
            }}
          >
            <p className="text-sm font-semibold text-gray-900 leading-relaxed whitespace-pre-line">
              {title}
            </p>
            {note && (
              <p className="text-xs text-gray-500 mt-2 leading-relaxed whitespace-pre-line">
                {note}
              </p>
            )}
            <p className="mt-3 text-[11px] text-purple-500 tracking-wide">
              画面をタップして閉じる
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SpotlightCoachMark;
