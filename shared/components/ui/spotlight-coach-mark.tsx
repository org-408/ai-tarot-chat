import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

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
  /** 周囲を暗くする不透明度 (0-1) */
  dimOpacity?: number;
  /**
   * 「画面をタップして閉じる」ヒント文言。プラットフォーム側で i18n 化
   * したテキストを渡す。省略時は日本語デフォルト。
   * (shared コンポーネントは i18n ライブラリを直接 import しないルール)
   */
  dismissHint?: string;
}

const BUBBLE_MAX_WIDTH = 320;
const BUBBLE_MARGIN = 12;
const VIEWPORT_MARGIN = 16;

/**
 * スポットライト型コーチマーク。
 *
 * 対象要素の周囲を「上・下・左・右」4 枚の半透明オーバーレイで囲うことで、
 * 対象だけを明るく残し、それ以外を暗転させて強調する。
 * `box-shadow` トリックは親要素の stacking context に巻き込まれて
 * 他 UI の背面に描画されるケースがあったため、描画が明示的な 4 矩形方式 + Portal で body 直下描画とした。
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
  dimOpacity = 0.6,
  dismissHint = "画面をタップして閉じる",
}) => {
  const [visible, setVisible] = useState(false);
  const [pointerActive, setPointerActive] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  // SSR 安全のため、Portal は mount 後にのみ有効化
  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) return null;

  // スポットライト（明るく残す領域）の矩形
  const holeTop = rect ? rect.top - spotlightPadding : 0;
  const holeLeft = rect ? rect.left - spotlightPadding : 0;
  const holeRight = rect ? rect.right + spotlightPadding : 0;
  const holeBottom = rect ? rect.bottom + spotlightPadding : 0;
  const holeWidth = rect ? rect.width + spotlightPadding * 2 : 0;
  const holeHeight = rect ? rect.height + spotlightPadding * 2 : 0;

  const dimBg = `rgba(0, 0, 0, ${dimOpacity})`;

  const overlay = (
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
            className="fixed inset-0 z-[9999]"
            style={{ pointerEvents: pointerActive ? "auto" : "none" }}
            onClick={onDismiss}
            role="dialog"
            aria-modal="true"
          />

          {/* 上の暗幕 */}
          <motion.div
            key="dim-top"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            aria-hidden="true"
            className="fixed pointer-events-none z-[10000]"
            style={{
              top: 0,
              left: 0,
              width: "100vw",
              height: Math.max(0, holeTop),
              background: dimBg,
            }}
          />
          {/* 下の暗幕 */}
          <motion.div
            key="dim-bottom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            aria-hidden="true"
            className="fixed pointer-events-none z-[10000]"
            style={{
              top: holeBottom,
              left: 0,
              width: "100vw",
              height: Math.max(0, viewportH - holeBottom),
              background: dimBg,
            }}
          />
          {/* 左の暗幕 */}
          <motion.div
            key="dim-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            aria-hidden="true"
            className="fixed pointer-events-none z-[10000]"
            style={{
              top: holeTop,
              left: 0,
              width: Math.max(0, holeLeft),
              height: holeHeight,
              background: dimBg,
            }}
          />
          {/* 右の暗幕 */}
          <motion.div
            key="dim-right"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            aria-hidden="true"
            className="fixed pointer-events-none z-[10000]"
            style={{
              top: holeTop,
              left: holeRight,
              width: Math.max(0, viewportW - holeRight),
              height: holeHeight,
              background: dimBg,
            }}
          />

          {/* ハイライト枠（対象位置の微かな縁取り。視線誘導用） */}
          <motion.div
            key="spotlight-border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            aria-hidden="true"
            className="fixed pointer-events-none z-[10001]"
            style={{
              top: holeTop,
              left: holeLeft,
              width: holeWidth,
              height: holeHeight,
              borderRadius: spotlightRadius,
              boxShadow: "0 0 0 2px rgba(255,255,255,0.6), 0 0 20px rgba(255,255,255,0.3)",
            }}
          />

          {/* 吹き出し */}
          <motion.div
            key="bubble"
            initial={{ opacity: 0, scale: 0.95, y: placeBelow ? -8 : 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="fixed z-[10002] px-6 py-5 rounded-2xl bg-white shadow-2xl pointer-events-none"
            style={{
              ...bubblePositionStyle,
              maxWidth: BUBBLE_MAX_WIDTH,
            }}
          >
            {/* タイトル: 「占いを始める」ボタン (text-lg font-bold) と同じ大きさに揃える */}
            <p className="text-lg font-bold text-gray-900 leading-relaxed whitespace-pre-line">
              {title}
            </p>
            {note && (
              <p className="text-base text-gray-600 mt-2 leading-relaxed whitespace-pre-line">
                {note}
              </p>
            )}
            <p className="mt-3 text-sm text-purple-500 tracking-wide">
              {dismissHint}
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
};

export default SpotlightCoachMark;
