import type { JWTPayload, MasterData } from "../../../shared/lib/types";
import type { UserPlan } from "../types";

interface TarotistPageProps {
  payload: JWTPayload;
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
          ?.sort((a, b) => (b.quality || 0) - (a.quality || 0))
          .map((tarotist) => {
            const isAvailable = canUseTarotist(tarotist.plan?.code || "GUEST");
            const requiresUpgrade = !isAvailable;

            return (
              <div
                key={tarotist.name}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isAvailable
                    ? "border-purple-200 bg-white hover:border-purple-300"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                {/* おすすめバッジ */}
                {tarotist.quality >= 4 && (
                  <div className="absolute -top-2 left-4 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    おすすめ
                  </div>
                )}

                {/* プランバッジ */}
                {tarotist.plan!.code !== "FREE" && (
                  <div className="absolute -top-2 right-4 bg-purple-500 text-white text-xs px-2 py-1 rounded">
                    {tarotist.plan!.code}
                  </div>
                )}

                <div className="flex gap-4">
                  {/* 占い師画像 */}
                  <div className="flex-shrink-0">
                    <img
                      src={`/tarotist/${tarotist.name}.png`}
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

                  {/* 占い師情報 */}
                  <div className="flex-1">
                    {/* タイトル */}
                    <div className="font-bold text-lg mb-1">
                      {tarotist.icon} {tarotist.title}
                    </div>

                    {/* 特徴 */}
                    <div className="text-sm text-purple-600 font-semibold mb-2">
                      {tarotist.trait}
                    </div>

                    {/* プロフィール */}
                    <div className="text-sm text-gray-700 mb-2 line-clamp-2">
                      {tarotist.bio}
                    </div>

                    {/* おすすめ度 */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="text-sm text-gray-600">おすすめ度:</div>
                      <div className="text-base">
                        {renderStars(tarotist.quality)}
                      </div>
                    </div>

                    {/* アクションボタン */}
                    {requiresUpgrade && (
                      <button
                        onClick={() => handleUpgrade(tarotist.plan!.code)}
                        disabled={isLoggingIn}
                        className="w-full py-2 px-4 bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-colors"
                      >
                        {isLoggingIn
                          ? "認証中..."
                          : !isAuthenticated
                          ? `ログイン＆${tarotist.plan!.code}にアップグレード`
                          : `${tarotist.plan!.code}にアップグレード`}
                      </button>
                    )}

                    {isAvailable && (
                      <div className="text-xs text-green-600 font-bold text-center">
                        ✓ 利用可能
                      </div>
                    )}
                  </div>
                </div>

                {/* アップグレード説明 */}
                {requiresUpgrade && (
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    この占い師を利用するには{tarotist.plan!.code}
                    プラン以上が必要です
                  </div>
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
            <li>• おすすめ度は精度と人気度を総合評価したものです</li>
            <li>• より高度な占い師はPREMIUMプランで利用可能</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TarotistPage;
