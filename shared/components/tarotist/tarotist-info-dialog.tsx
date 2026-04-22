import { AnimatePresence, motion } from "framer-motion";
import type { Plan, Tarotist } from "../../lib/types";

/** ⭐️ の繰り返し表示 */
function renderStars(quality: number): string {
  return "⭐️".repeat(quality);
}

export interface TarotistInfoDialogProps {
  tarotist: Tarotist;
  /** 現在のユーザープラン。canUse 判定に使用 */
  currentPlan?: Plan | null;
  onClose: () => void;
  /**
   * アップグレードボタン押下時のコールバック。
   * 省略した場合はアップグレードボタンを表示しない（履歴などのボタンなしモード）。
   */
  onUpgrade?: (planCode: string) => void;
  /** アップグレード処理中フラグ */
  isUpgrading?: boolean;
}

/**
 * タロティスト情報ダイアログ（共通）。
 * - プランバッジ・画像・名前（筆記体）・タイトル・特徴・おすすめ度・bio を表示
 * - onUpgrade が渡された場合のみアップグレードボタンを表示
 * - モバイル・Web 双方で使用可能（platform-agnostic）
 */
export function TarotistInfoDialog({
  tarotist,
  currentPlan,
  onClose,
  onUpgrade,
  isUpgrading = false,
}: TarotistInfoDialogProps) {
  const primaryColor = tarotist.primaryColor ?? "#7c3aed";
  const accentColor = tarotist.accentColor ?? "#8b5cf6";

  const canUse =
    !tarotist.plan ||
    !currentPlan ||
    tarotist.plan.no <= currentPlan.no;

  const handleUpgrade = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (tarotist.plan?.code) {
      onUpgrade?.(tarotist.plan.code);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          className="w-full max-w-sm bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* ヘッダー画像エリア */}
          <div
            className="relative h-52 flex items-end"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
            }}
          >
            <img
              src={`/tarotists/${tarotist.name}.png`}
              alt={tarotist.name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: "center 15%" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            {/* プランバッジ */}
            {tarotist.plan && (
              <div className="absolute top-3 right-3 z-10">
                <span
                  className="text-white text-xs px-3 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: tarotist.plan.accentColor ?? accentColor }}
                >
                  {tarotist.plan.name}プラン
                </span>
              </div>
            )}
          </div>

          {/* コンテンツ */}
          <div className="p-6" style={{
            background: `linear-gradient(to bottom, ${primaryColor}22 0%, white 30%)`,
          }}>
            {/* 名前（筆記体） */}
            <h2
              className="text-3xl font-bold text-center mb-1"
              style={{
                fontFamily: "'MonteCarlo', cursive",
                color: accentColor,
              }}
            >
              {tarotist.icon} {tarotist.name}
            </h2>

            {/* タイトル */}
            <p className="text-center text-sm text-gray-500 mb-2">
              {tarotist.title}
            </p>

            {/* 特徴 */}
            {tarotist.trait && (
              <p
                className="text-center text-sm font-semibold mb-4"
                style={{ color: accentColor }}
              >
                {tarotist.trait}
              </p>
            )}

            {/* おすすめ度 */}
            {tarotist.quality != null && (
              <div className="flex items-center justify-center gap-2 mb-4 pb-4 border-b border-gray-100">
                <span className="text-xs text-gray-500">おすすめ度:</span>
                <span className="text-base">{renderStars(tarotist.quality)}</span>
              </div>
            )}

            {/* bio */}
            {tarotist.bio && (
              <p
                className="text-sm text-gray-700 leading-relaxed mb-6"
                dangerouslySetInnerHTML={{ __html: tarotist.bio }}
              />
            )}

            {/* ボタン（onUpgrade がある場合のみ表示） */}
            {onUpgrade && (
              <div className="mb-3">
                {!canUse ? (
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    disabled={isUpgrading}
                    className="w-full py-3 px-4 text-sm text-white rounded-xl font-semibold transition-all shadow-md disabled:opacity-50"
                    style={{ backgroundColor: accentColor }}
                  >
                    {isUpgrading
                      ? "認証中..."
                      : `${tarotist.plan?.name ?? "上位"}プランにアップグレード`}
                  </button>
                ) : (
                  <div
                    className="w-full py-3 px-4 border-2 text-center rounded-xl font-bold text-sm"
                    style={{
                      borderColor: accentColor,
                      color: accentColor,
                      backgroundColor: `${primaryColor}44`,
                    }}
                  >
                    ✓ この占い師は利用可能です
                  </div>
                )}
              </div>
            )}

            {/* 閉じるボタン */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              閉じる
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
