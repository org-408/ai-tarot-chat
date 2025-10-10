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
          ?.sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((tarotist) => {
            const isAvailable = canUseTarotist(tarotist.plan?.code || "GUEST");
            const requiresUpgrade = !isAvailable;

            return (
              <div
                key={tarotist.name}
                className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  isAvailable
                    ? "border-purple-200 bg-white hover:border-purple-300"
                    : "border-gray-200 bg-gray-50"
                }`}
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
                    {/* タイトル */}
                    <div className="font-bold text-lg mb-1">
                      {tarotist.icon} {tarotist.title}
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
                        {renderStars(tarotist.quality)}
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
            <li>
              • おすすめ度はAIモデルの回答の質や信頼性を総合評価したものです
            </li>
            <li>• より高度な占い師はPREMIUMプランで利用可能</li>
            <li>• カードをタップすると詳細プロフィールが表示されます</li>
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
                className="w-48 h-48 rounded-xl object-cover shadow-lg"
                onError={(e) => {
                  e.currentTarget.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='80'%3E🔮%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>

            {/* タイトル */}
            <h3 className="text-xl font-bold text-purple-900 text-center mb-2">
              {selectedTarotist.icon} {selectedTarotist.title}
            </h3>

            {/* 特徴 */}
            <div className="text-center text-purple-600 font-semibold mb-4">
              {selectedTarotist.trait}
            </div>

            {/* おすすめ度 */}
            <div className="flex items-center justify-center gap-2 mb-4 pb-4 border-b border-gray-200">
              <div className="text-sm text-gray-600">おすすめ度:</div>
              <div className="text-lg">
                {renderStars(selectedTarotist.quality)}
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
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-all mb-3"
              >
                {isLoggingIn
                  ? "認証中..."
                  : !isAuthenticated
                  ? `ログイン＆${selectedTarotist.plan!.name}にアップグレード`
                  : `${selectedTarotist.plan!.name}にアップグレード`}
              </button>
            ) : (
              <div className="w-full py-3 px-4 bg-green-50 border-2 border-green-500 text-green-700 rounded-lg font-bold text-center mb-3">
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
    </div>
  );
};

export default TarotistPage;
