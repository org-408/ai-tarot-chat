"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface TwoColumnReadingLayoutProps {
  /** 左カラム（必須）*/
  left: ReactNode;
  /** 右カラム（無い場合 = 右非表示） */
  right?: ReactNode;
  /** 右カラムの表示状態（right が無い場合は無視） */
  rightVisible: boolean;
  onToggleRight: () => void;
  /** ヘッダー右端に出すバッジ（残り回数など） */
  headerRight?: ReactNode;
  /** 戻るリンクのラベル */
  backLabel: string;
  /** 戻る先（デフォルト "/"） */
  backHref?: string;
  /** 戻るボタンを非活性にする（占い中）場合の tooltip 文言 */
  lockedLabel?: string;
  /** ロック中（戻る不可）*/
  isLocked?: boolean;
  onHeaderBack?: () => void;
  /** トグルボタンを常時表示するか。デフォルト true */
  showToggle?: boolean;
  showSpreadLabel?: string;
  hideSpreadLabel?: string;
}

/**
 * Web 版リーディング画面の 2 カラムレイアウト。
 * 左右 1:1 固定。右カラムはトグルで表示／非表示切替。
 * 非表示時は左カラムが全幅。
 */
export function TwoColumnReadingLayout({
  left,
  right,
  rightVisible,
  onToggleRight,
  headerRight,
  backLabel,
  backHref = "/",
  lockedLabel,
  isLocked = false,
  onHeaderBack,
  showToggle = true,
  showSpreadLabel = "スプレッドを表示",
  hideSpreadLabel = "スプレッドを隠す",
}: TwoColumnReadingLayoutProps) {
  const hasRight = right != null;
  const rightIsOpen = hasRight && rightVisible;

  return (
    <div className="flex flex-col h-[100dvh] -m-4 md:-m-6">
      {/* ヘッダー */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-purple-100">
        {isLocked ? (
          <button
            type="button"
            disabled
            title={lockedLabel}
            className="flex items-center gap-1 text-sm text-gray-400 cursor-not-allowed"
          >
            <Lock size={14} />
            {backLabel}
          </button>
        ) : (
          <Link
            href={backHref}
            onClick={onHeaderBack}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </Link>
        )}
        {headerRight}
      </div>

      {/* 本体: 2 カラム */}
      <div className="flex-1 min-h-0 flex relative">
        {/* 左カラム */}
        <div
          className={`min-h-0 h-full overflow-hidden ${
            rightIsOpen ? "w-1/2" : "w-full"
          } transition-[width] duration-300`}
        >
          {left}
        </div>

        {/* 右カラム */}
        {rightIsOpen && (
          <div className="min-h-0 h-full w-1/2 overflow-hidden border-l border-purple-100 bg-white">
            {right}
          </div>
        )}

        {/* トグルボタン（常時表示・中央境界上） */}
        {hasRight && showToggle && (
          <button
            type="button"
            onClick={onToggleRight}
            aria-label={rightIsOpen ? hideSpreadLabel : showSpreadLabel}
            title={rightIsOpen ? hideSpreadLabel : showSpreadLabel}
            className="absolute top-1/2 -translate-y-1/2 z-40 bg-white border border-purple-200 shadow-md hover:bg-purple-50 rounded-full w-8 h-8 flex items-center justify-center transition-all"
            style={{
              right: rightIsOpen ? "calc(50% - 16px)" : "12px",
            }}
          >
            <motion.div
              animate={{ rotate: 0 }}
              transition={{ duration: 0.25 }}
            >
              {rightIsOpen ? (
                <ChevronRight size={16} className="text-purple-600" />
              ) : (
                <ChevronLeft size={16} className="text-purple-600" />
              )}
            </motion.div>
          </button>
        )}
      </div>
    </div>
  );
}
