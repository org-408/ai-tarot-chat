import { useState } from "react";
import type {
  AppJWTPayload,
  MasterData,
  Tarotist,
} from "../../../shared/lib/types";
import type { UserPlan } from "../types";

interface TarotistPageProps {
  payload: AppJWTPayload;
  isAuthenticated: boolean;
  masterData: MasterData;
  onLogin: () => void;
  onUpgrade: (plan: UserPlan) => void;
  isLoggingIn: boolean;
}

const TarotistPage: React.FC<TarotistPageProps> = ({
  payload,
  isAuthenticated,
  masterData,
  onLogin,
  onUpgrade,
  isLoggingIn,
}) => {
  const [selectedTarotist, setSelectedTarotist] = useState<Tarotist | null>(
    null
  );
  const [imageViewTarotist, setImageViewTarotist] = useState<Tarotist | null>(
    null
  );
  const currentPlan = payload.planCode || "GUEST";

  const handleUpgrade = (requiredPlan: string) => {
    // 未認証の場合はログイン
    if (!isAuthenticated) {
      onLogin();
      return;
    }

    // 必要なプランにアップグレード
    onUpgrade(requiredPlan as UserPlan);
  };

  const canUseTarotist = (requiredPlan: string) => {
    const planHierarchy: Record<string, number> = {
      GUEST: 0,
      FREE: 1,
      STANDARD: 2,
      PREMIUM: 3,
    };
    return planHierarchy[currentPlan] >= planHierarchy[requiredPlan];
  };

  const renderStars = (quality: number) => {
    return "⭐️".repeat(quality);
  };

  // 占い師ごとのカラーを取得（DBから、なければデフォルト）
  const getTarotistColor = (tarotist: Tarotist) => {
    // MasterDataから色情報を取得（primary/secondary/accent）
    const primary = tarotist.primaryColor || "#E0D0FF"; // デフォルト: 淡いパープル
    const secondary = tarotist.secondaryColor || "#C8A2E0"; // デフォルト: 中間パープル
    const accent = tarotist.accentColor || "#B794D6"; // デフォルト: 濃いパープル

    return {
      primary, // 背景色（一番淡い）
      secondary, // サブカラー（中間）
      accent, // アクセント色（一番濃い）
      // 後方互換性のため
      bg: primary,
      button: accent,
    };
  };

  return (
    <div className="main-container">
      {/* ヘッダー */}
      <div className="page-title pt-3">🔮 タロット占い師</div>

      {/* 現在の状態表示 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
        <div className="text-sm text-gray-600">現在のプラン</div>
        <div className="font-bold text-lg">
          {masterData.plans.find((p) => p.code === currentPlan)?.name ||
            currentPlan}
        </div>
        {!isAuthenticated && (
          <div className="text-xs text-orange-600 mt-1">
            ⚠️ 未認証（有料プラン選択時に自動ログイン）
          </div>
        )}
      </div>

      {/* 占い師カード一覧 */}
      <div className="space-y-4">
        {masterData.tarotists
          ?.sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((tarotist) => {
            const isAvailable = canUseTarotist(tarotist.plan?.code || "GUEST");
            const requiresUpgrade = !isAvailable;
            const colors = getTarotistColor(tarotist);

            return (
              <div
                key={tarotist.name}
                className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  isAvailable
                    ? "border-purple-200 hover:border-purple-300"
                    : "border-gray-300 opacity-80"
                }`}
                style={{
                  backgroundColor: colors.bg,
                }}
                onClick={() => setSelectedTarotist(tarotist)}
              >
                {/* プランバッジ */}
                <div className="absolute -top-2 right-4 bg-purple-500 text-white text-xs px-2 py-1 rounded">
                  {tarotist.plan!.name}
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

                  {/* 占い師情報（簡易版） */}
                  <div className="flex-1">
                    {/* 名前（筆記体で強調） */}
                    <div
                      className="font-bold text-2xl mb-1"
                      style={{ fontFamily: "'Brush Script MT', cursive" }}
                    >
                      {tarotist.icon} {tarotist.name}
                    </div>

                    {/* タイトル */}
                    <div className="text-sm text-gray-600 mb-2">
                      {tarotist.title}
                    </div>

                    {/* 特徴 */}
                    <div className="text-sm text-purple-600 font-semibold mb-2">
                      {tarotist.trait}
                    </div>

                    {/* プロフィール（2行まで） */}
                    <div className="text-sm text-gray-700 mb-2 line-clamp-2">
                      {tarotist.bio}
                    </div>

                    {/* おすすめ度 */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="text-sm text-gray-600">おすすめ度:</div>
                      <div className="text-base">
                        {renderStars(tarotist.quality!)}
                      </div>
                    </div>

                    {/* ステータス */}
                    {requiresUpgrade ? (
                      <div className="text-xs text-gray-500 text-center">
                        {tarotist.plan!.name}プラン以上で利用可能
                      </div>
                    ) : (
                      <div className="text-xs text-green-600 font-bold text-center">
                        ✓ 利用可能
                      </div>
                    )}
                  </div>
                </div>

                {/* アップグレードボタン（カード下部） */}
                {requiresUpgrade && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpgrade(tarotist.plan!.code);
                    }}
                    disabled={isLoggingIn}
                    className="w-full mt-3 py-2 px-4 text-white rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-all shadow-md"
                    style={{
                      backgroundColor: colors.button,
                    }}
                  >
                    {isLoggingIn
                      ? "認証中..."
                      : !isAuthenticated
                      ? `ログイン＆${tarotist.plan!.name}にアップグレード`
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
            <li>（感じ方には個人差がありますので体験してみてください）</li>
            <li>• 占い師をタップすると拡大したプロフィールが表示されます</li>
          </ul>
        </div>
      </div>

      {/* プロフィール拡大ダイアログ */}
      {selectedTarotist && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTarotist(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: `linear-gradient(to bottom, ${
                getTarotistColor(selectedTarotist).bg
              } 0%, white 40%)`,
            }}
          >
            {/* プランバッジ */}
            <div className="flex justify-center mb-4">
              <div className="bg-purple-500 text-white text-sm px-3 py-1 rounded-full">
                {selectedTarotist.plan!.name}プラン
              </div>
            </div>

            {/* 占い師画像（カラー・拡大） */}
            <div className="flex justify-center mb-4">
              <img
                src={`/tarotists/${selectedTarotist.name}.png`}
                alt={selectedTarotist.title}
                className="w-48 h-48 rounded-xl object-cover shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageViewTarotist(selectedTarotist);
                }}
                onError={(e) => {
                  e.currentTarget.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='80'%3E🔮%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>

            {/* 名前（筆記体で強調） */}
            <h3
              className="text-3xl font-bold text-purple-900 text-center mb-1"
              style={{ fontFamily: "'Brush Script MT', cursive" }}
            >
              {selectedTarotist.icon} {selectedTarotist.name}
            </h3>

            {/* タイトル */}
            <div className="text-center text-gray-600 mb-2">
              {selectedTarotist.title}
            </div>

            {/* 特徴 */}
            <div className="text-center text-purple-600 font-semibold mb-4">
              {selectedTarotist.trait}
            </div>

            {/* おすすめ度 */}
            <div className="flex items-center justify-center gap-2 mb-4 pb-4 border-b border-gray-200">
              <div className="text-sm text-gray-600">おすすめ度:</div>
              <div className="text-lg">
                {renderStars(selectedTarotist.quality!)}
              </div>
            </div>

            {/* プロフィール */}
            <div className="text-sm text-gray-700 leading-relaxed mb-6">
              {selectedTarotist.bio}
            </div>

            {/* アクションボタン */}
            {!canUseTarotist(selectedTarotist.plan?.code || "GUEST") ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpgrade(selectedTarotist.plan!.code);
                  setSelectedTarotist(null);
                }}
                disabled={isLoggingIn}
                className="w-full py-3 px-4 text-white rounded-lg font-medium hover:opacity-80 disabled:opacity-50 transition-all mb-3 shadow-md"
                style={{
                  backgroundColor: getTarotistColor(selectedTarotist).button,
                }}
              >
                {isLoggingIn
                  ? "認証中..."
                  : !isAuthenticated
                  ? `ログイン＆${selectedTarotist.plan!.name}にアップグレード`
                  : `${selectedTarotist.plan!.name}にアップグレード`}
              </button>
            ) : (
              <div
                className="w-full py-3 px-4 border-2 text-center rounded-lg font-bold mb-3"
                style={{
                  borderColor: getTarotistColor(selectedTarotist).button,
                  color: getTarotistColor(selectedTarotist).button,
                  backgroundColor: `${getTarotistColor(selectedTarotist).bg}80`,
                }}
              >
                ✓ この占い師は利用可能です
              </div>
            )}

            {/* 閉じるボタン */}
            <button
              onClick={() => setSelectedTarotist(null)}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg py-2 font-medium transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 画像全画面表示ダイアログ */}
      {imageViewTarotist && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60]"
          onClick={() => setImageViewTarotist(null)}
        >
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            {/* 閉じるボタン */}
            <button
              onClick={() => setImageViewTarotist(null)}
              className="absolute top-8 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-2xl transition-colors z-10"
            >
              ×
            </button>

            {/* タイトル表示 */}
            <div className="absolute top-8 left-4 right-16 text-white z-10">
              <div
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: "'Brush Script MT', cursive" }}
              >
                {imageViewTarotist.icon} {imageViewTarotist.name}
              </div>
              <div className="text-sm opacity-90">
                {imageViewTarotist.title}
              </div>
              <div className="text-sm opacity-80">
                {imageViewTarotist.trait}
              </div>
            </div>

            {/* 画像 */}
            <img
              src={`/tarotists/${imageViewTarotist.name}.png`}
              alt={imageViewTarotist.title}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                e.currentTarget.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='120'%3E🔮%3C/text%3E%3C/svg%3E";
              }}
            />

            {/* タップで閉じるヒント */}
            <div className="absolute bottom-8 text-white/60 text-sm">
              タップで閉じる
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TarotistPage;
