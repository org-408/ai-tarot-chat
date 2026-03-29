import { useState } from "react";
import type {
  AppJWTPayload,
  MasterData,
  Plan,
  Tarotist,
} from "../../../shared/lib/types";
import {
  canUseTarotist,
  getPlanColors,
  getTarotistColor,
  renderStars,
} from "../lib/utils/salon";
import type { UserPlan } from "../types";
import ProfileDialog from "./profile-dialog";

interface TarotistPageProps {
  payload: AppJWTPayload;
  currentPlan: Plan;
  masterData: MasterData;
  onChangePlan: (plan: UserPlan) => void;
  isChangingPlan: boolean;
  onNavigateToClara?: () => void;
}

const TarotistPage: React.FC<TarotistPageProps> = ({
  payload,
  currentPlan,
  masterData,
  onChangePlan,
  isChangingPlan,
  onNavigateToClara,
}) => {
  const [selectedTarotist, setSelectedTarotist] = useState<Tarotist | null>(
    null
  );
  const availableTarotists = masterData.tarotists || [];

  const handleChangePlan = (requiredPlan: string) => {
    onChangePlan(requiredPlan as UserPlan);
  };

  const plans = masterData.plans || [];
  const currentColors = currentPlan
    ? getPlanColors(currentPlan.code, plans)
    : getPlanColors("GUEST", plans);

  const [showProfileView, setShowProfileView] = useState(false);
  const [showImageView, setShowImageView] = useState(false);

  return (
    <div className="main-container">
      {/* ヘッダー */}
      <div className="page-title pt-3">🔮 タロット占い師</div>

      {/* 現在の状態表示 */}
      <div
        className="mb-6 p-4 rounded-lg text-center border-2"
        style={{
          backgroundColor: currentColors.primary,
          borderColor: currentColors.secondary,
        }}
      >
        <div className="text-sm text-gray-600">現在のプラン</div>
        <div
          className="font-bold text-lg"
          style={{ color: currentColors.accent }}
        >
          {currentPlan.name}
        </div>
        {!payload.user && (
          <div className="text-xs text-orange-600 mt-1">
            ⚠️ 未認証(有料プラン選択時に自動ログイン)
          </div>
        )}
      </div>

      {/* 占い師カード一覧 */}
      <div className="space-y-4">
        {availableTarotists
          ?.sort((a, b) => (a.no || 0) - (b.no || 0))
          .map((tarotist) => {
            const isAvailable = canUseTarotist(tarotist.plan!, currentPlan);
            const requiresUpgrade = !isAvailable;
            const colors = getTarotistColor(tarotist);

            return (
              <div
                key={tarotist.name}
                className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  isAvailable ? "hover:shadow-md" : "opacity-80"
                }`}
                style={{
                  backgroundColor: colors.bg,
                  borderColor: colors.secondary,
                }}
                onClick={() => {
                  setSelectedTarotist(tarotist);
                }}
              >
                {/* プランバッジ */}
                <div
                  className="absolute -top-2 right-4 text-white text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: tarotist.plan!.accentColor }}
                >
                  {tarotist.provider === "OFFLINE"
                    ? "オフライン"
                    : tarotist.plan!.name}
                </div>

                <div className="flex gap-4">
                  {/* 占い師画像 */}
                  <div className="flex-shrink-0">
                    <img
                      src={`/tarotists/${tarotist.name}.png`}
                      alt={tarotist.title}
                      className={`w-24 h-24 rounded-lg object-cover ${
                        !isAvailable ? "opacity-50 grayscale" : ""
                      }`}
                      onError={(e) => {
                        e.currentTarget.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='40'%3E🔮%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>

                  {/* 占い師情報(簡易版) */}
                  <div className="flex-1">
                    {/* 名前(筆記体で強調) */}
                    <div
                      className="font-bold text-2xl mb-1"
                      style={{
                        fontFamily: "'Brush Script MT', cursive",
                        color: colors.accent,
                      }}
                    >
                      {tarotist.icon} {tarotist.name}
                    </div>

                    {/* タイトル */}
                    <div className="text-sm text-gray-600 mb-2">
                      {tarotist.title}
                    </div>

                    {/* 特徴 */}
                    <div
                      className="text-sm font-semibold mb-2"
                      style={{ color: colors.accent }}
                    >
                      {tarotist.trait}
                    </div>

                    {/* プロフィール */}
                    <div
                      className="text-sm text-gray-700 mb-2"
                      dangerouslySetInnerHTML={{ __html: tarotist.bio ?? "" }}
                    />

                    {/* おすすめ度 */}
                    {tarotist.provider !== "OFFLINE" && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="text-sm text-gray-600">おすすめ度:</div>
                        <div className="text-base">
                          {renderStars(tarotist.quality!)}
                        </div>
                      </div>
                    )}

                    {/* ステータス */}
                    {tarotist.provider !== "OFFLINE" && requiresUpgrade ? (
                      <div className="text-xs text-gray-500 text-center">
                        {tarotist.plan!.name}プラン以上で利用可能
                      </div>
                    ) : (
                      <div className="text-xs text-green-600 font-bold text-center">
                        {tarotist.provider !== "OFFLINE"
                          ? "✓ 利用可能"
                          : "オフライン時のみご利用いただけます"}
                      </div>
                    )}
                  </div>
                </div>

                {/* アップグレードボタン(カード下部) */}
                {tarotist.provider !== "OFFLINE" && requiresUpgrade && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChangePlan(tarotist.plan!.code);
                    }}
                    disabled={isChangingPlan}
                    className="w-full mt-3 py-2 px-4 text-white rounded-lg text-sm font-medium transition-all shadow-md"
                    style={{
                      backgroundColor: tarotist.plan!.accentColor,
                    }}
                  >
                    {isChangingPlan
                      ? "認証中..."
                      : `${tarotist.plan!.name}にアップグレード`}
                  </button>
                )}
              </div>
            );
          })}
      </div>

      {/* 注意事項 */}
      <div className="mt-6 p-3 bg-purple-50 rounded-lg">
        <div className="text-xs text-purple-800">
          <div className="font-bold mb-1">📝 占い師について</div>
          <ul className="space-y-1">
            <li>• 各占い師は異なるAIモデルを使用しています</li>
            <li>• プランによって利用できる占い師が異なります</li>
            <li>• おすすめ度は各占い師の特性に基づいて独自評価したものです</li>
            <li>(感じ方には個人差がありますので体験してみてください)</li>
            <li>• 占い師をタップすると拡大したプロフィールが表示されます</li>
          </ul>
        </div>
      </div>

      {/* プロフィール拡大ダイアログ & 画像全画面表示ダイアログ */}
      {selectedTarotist && (
        <ProfileDialog
          selectedTarotist={selectedTarotist}
          showProfileView={showProfileView}
          setShowProfileView={setShowProfileView}
          showImageView={showImageView}
          setShowImageView={setShowImageView}
          hasButton
          currentPlan={currentPlan}
          onChangePlan={handleChangePlan}
          isChangingPlan={isChangingPlan}
        />
      )}
    </div>
  );
};

export default TarotistPage;
