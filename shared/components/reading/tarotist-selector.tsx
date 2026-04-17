import { motion } from "framer-motion";
import { useState } from "react";
import type { Plan, Tarotist } from "../../lib/types";

interface TarotistSelectorLabels {
  /** プレミアム占い師バッジテキスト。例: "✨ プレミアム占い師" */
  premiumBadge?: string;
  /** プラン不足オーバーレイテキスト。例: "🔒 プランが必要" */
  planRequired?: string;
  /** 占い師が見つからない場合のテキスト */
  noTarotists?: string;
}

interface TarotistSelectorProps {
  tarotists: Tarotist[];
  selectedTarotist: Tarotist | null;
  onSelect: (tarotist: Tarotist) => void;
  /**
   * true の場合、plan.code === "PREMIUM" の占い師のみ表示 (パーソナル占い用)。
   * false / undefined の場合は全占い師を表示 (クイック占い用)。
   */
  premiumOnly?: boolean;
  /** ユーザーの現在プラン。plan.no に基づく利用可否判定に使用 */
  currentPlan?: Plan | null;
  /** 占い師画像の base パス。デフォルト: "/tarotists" */
  tarotistBasePath?: string;
  /** UI テキスト。プラットフォームごとに翻訳済み文字列を渡す */
  labels?: TarotistSelectorLabels;
  /** true の場合、カード内に占い師の bio（紹介文）を表示する。Web 大画面向け */
  showBio?: boolean;
}

const renderStars = (quality: number | null | undefined): string =>
  "⭐️".repeat(quality ?? 0);

const canUseTarotist = (tarotist: Tarotist, currentPlan: Plan | null | undefined): boolean => {
  if (!currentPlan || !tarotist.plan) return true;
  return tarotist.plan.no <= currentPlan.no;
};

/**
 * タロティスト選択コンポーネント。
 * premiumOnly=true でパーソナル占い (PREMIUM 占い師のみ)。
 * premiumOnly=false/undefined でクイック占い (全占い師)。
 * プラットフォーム非依存。
 */
export const TarotistSelector: React.FC<TarotistSelectorProps> = ({
  tarotists,
  selectedTarotist,
  onSelect,
  premiumOnly = false,
  currentPlan,
  tarotistBasePath = "/tarotists",
  labels = {},
  showBio = false,
}) => {
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const {
    premiumBadge = "✨ プレミアム占い師",
    planRequired = "🔒 プランが必要",
    noTarotists = "占い師が見つかりませんでした",
  } = labels;

  const filtered = premiumOnly
    ? tarotists.filter((t) => t.plan?.code === "PREMIUM")
    : tarotists;

  return (
    <div className="w-full">
      {premiumOnly && (
        <div className="text-center mb-3">
          <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">
            {premiumBadge}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtered.map((tarotist) => {
          const isSelected = selectedTarotist?.id === tarotist.id;
          const canUse = canUseTarotist(tarotist, currentPlan);
          const primaryColor = tarotist.primaryColor ?? "#7c3aed";
          const accentColor = tarotist.accentColor ?? "#8b5cf6";

          return (
            <motion.button
              key={tarotist.id}
              type="button"
              onClick={() => canUse && onSelect(tarotist)}
              disabled={!canUse}
              whileHover={canUse ? { scale: 1.02 } : undefined}
              whileTap={canUse ? { scale: 0.98 } : undefined}
              className={`relative rounded-2xl overflow-hidden transition-all text-left ${
                isSelected
                  ? "ring-4 shadow-xl"
                  : "ring-1 ring-gray-200 shadow-sm"
              } ${!canUse ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              style={
                isSelected
                  ? { boxShadow: `0 0 0 4px ${accentColor}` }
                  : undefined
              }
            >
              {/* カード背景 */}
              <div
                className="w-full aspect-[3/4] relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}CC, ${accentColor}99)`,
                }}
              >
                {/* 占い師画像 */}
                <img
                  src={`${tarotistBasePath}/${tarotist.name}.png`}
                  alt={tarotist.name}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: "center 15%" }}
                  onError={() => {
                    setImgErrors((prev) => new Set(prev).add(tarotist.id));
                  }}
                />

                {/* 画像読み込み失敗時のみ絵文字フォールバックを表示 */}
                {imgErrors.has(tarotist.id) && (
                  <div
                    className="absolute inset-0 flex items-center justify-center text-4xl pointer-events-none"
                    aria-hidden="true"
                  >
                    {tarotist.icon}
                  </div>
                )}

                {/* 選択済みオーバーレイ */}
                {isSelected && (
                  <div
                    className="absolute inset-0 border-4 rounded-2xl"
                    style={{ borderColor: accentColor }}
                  />
                )}

                {/* 利用不可オーバーレイ */}
                {!canUse && (
                  <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center rounded-2xl">
                    <span className="text-white text-xs font-semibold bg-gray-800/70 px-2 py-1 rounded-full">
                      {planRequired}
                    </span>
                  </div>
                )}
              </div>

              {/* 情報エリア */}
              <div className="p-2 bg-white">
                <div className="font-bold text-sm text-gray-900 truncate">
                  {tarotist.icon} {tarotist.name}
                </div>
                <div className="text-[11px] text-gray-500 truncate">
                  {tarotist.title}
                </div>
                {tarotist.quality != null && (
                  <div className="text-[10px] mt-0.5">
                    {renderStars(tarotist.quality)}
                  </div>
                )}
                {showBio && tarotist.bio && (
                  <div className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                    {tarotist.bio}
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          {noTarotists}
        </div>
      )}
    </div>
  );
};
