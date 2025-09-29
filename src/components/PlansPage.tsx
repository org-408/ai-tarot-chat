import { UserPlan } from "@/types";

interface PlansPageProps {
  currentPlan: UserPlan;
  onChangePlan: (plan: UserPlan) => void;
  isAuthenticated: boolean;
  onLogin: () => void;
  isLoggingIn: boolean;
}

const PlansPage: React.FC<PlansPageProps> = ({
  currentPlan,
  onChangePlan,
  isAuthenticated,
  onLogin,
  isLoggingIn,
}) => {
  const planData = {
    GUEST: {
      name: "🆓 ゲストプラン",
      price: "¥0/月",
      description: "ユーザー登録なしでお気軽に体験",
      features: [
        "1日1回制限",
        "広告表示あり",
        "基本スプレッド（2種類）",
        "恋愛・仕事・今日の運勢",
        "即答型占い",
      ],
      color: "from-green-400 to-green-600",
      popular: false,
      requiresAuth: false,
    },
    FREE: {
      name: "🆓 フリープラン",
      price: "¥0/月",
      description: "もう少し占い方向けに",
      features: [
        "1日3回制限",
        "広告表示あり",
        "基本スプレッド（2種類）",
        "恋愛・仕事・今日の運勢",
        "即答型占い",
      ],
      color: "from-green-400 to-green-600",
      popular: false,
      requiresAuth: false,
    },
    STANDARD: {
      name: "💎 スタンダードプラン",
      price: "¥480/月",
      description: "しっかり占いたい方に",
      features: [
        "回数無制限",
        "広告なし",
        "中級スプレッド（14種類）",
        "5つの詳細ジャンル",
        "履歴保存機能",
        "根拠表示オプション",
        "TODO機能",
      ],
      color: "from-blue-400 to-blue-600",
      popular: true,
      requiresAuth: true,
    },
    PREMIUM: {
      name: "👑 プレミアムプラン",
      price: "¥980/月",
      description: "AIと対話しながら本格占い",
      features: [
        "回数無制限",
        "広告なし",
        "全スプレッド（22種類）",
        "AI自動推奨機能",
        "15分AI対話セッション",
        "高度スプレッド（ケルト十字等）",
        "お気に入り学習機能",
        "行動計画生成",
      ],
      color: "from-yellow-400 to-orange-500",
      popular: false,
      requiresAuth: true,
    },
  };

  const handlePlanChange = (planKey: keyof typeof planData) => {
    const plan = planData[planKey];

    // 有料プランかつ未認証の場合はログインが必要
    if (plan.requiresAuth && !isAuthenticated) {
      onLogin();
      return;
    }

    // TODO: プラン変更処理
    onChangePlan(planKey);
  };

  return (
    <div className="main-container">
      {/* ヘッダー */}
      <div className="page-title">💎 プラン選択</div>

      {/* 認証状態表示 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
        <div className="text-sm text-gray-600">現在の状態</div>
        <div className="font-bold text-lg">{planData[currentPlan].name}</div>
        <div className="text-sm text-gray-500">
          {planData[currentPlan].price}
        </div>
        {!isAuthenticated && (
          <div className="text-xs text-orange-600 mt-1">
            ⚠️ 未認証（有料プラン選択時に自動ログイン）
          </div>
        )}
      </div>

      {/* プラン比較カード */}
      <div className="space-y-4">
        {(
          Object.entries(planData) as [
            keyof typeof planData,
            typeof planData.FREE
          ][]
        ).map(([planKey, plan]) => (
          <div
            key={planKey}
            className={`relative p-4 rounded-lg border-2 transition-all ${
              currentPlan === planKey
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            {/* 人気バッジ */}
            {plan.popular && (
              <div className="absolute -top-2 left-4 bg-red-500 text-white text-xs px-2 py-1 rounded">
                おすすめ
              </div>
            )}

            {/* 認証必須バッジ */}
            {plan.requiresAuth && (
              <div className="absolute -top-2 right-4 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                認証必須
              </div>
            )}

            {/* プランヘッダー */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-bold text-lg">{plan.name}</div>
                <div className="text-sm text-gray-600">{plan.description}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-xl">{plan.price}</div>
                {currentPlan === planKey && (
                  <div className="text-xs text-blue-600 font-bold">利用中</div>
                )}
              </div>
            </div>

            {/* 機能リスト */}
            <div className="mb-4">
              <div className="text-sm font-bold mb-2">主な機能</div>
              <ul className="space-y-1">
                {plan.features.map((feature, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-700 flex items-center"
                  >
                    <span className="text-green-500 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* アクションボタン */}
            <div className="flex gap-2">
              {currentPlan === planKey ? (
                <div className="w-full py-2 px-4 bg-gray-200 text-gray-600 rounded-lg text-center text-sm">
                  現在利用中
                </div>
              ) : (
                <button
                  onClick={() => handlePlanChange(planKey)}
                  disabled={isLoggingIn}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-bold text-white transition-colors bg-gradient-to-r ${plan.color} hover:opacity-90 disabled:opacity-50`}
                >
                  {isLoggingIn
                    ? "認証中..."
                    : plan.requiresAuth && !isAuthenticated
                    ? `ログイン＆${
                        planKey === "STANDARD"
                          ? "アップグレード"
                          : "プレミアム登録"
                      }`
                    : planKey === "FREE"
                    ? "フリープランに変更"
                    : currentPlan === "FREE"
                    ? "アップグレード"
                    : planKey === "STANDARD" && currentPlan === "PREMIUM"
                    ? "ダウングレード"
                    : "プラン変更"}
                </button>
              )}
            </div>

            {/* 認証必須の説明 */}
            {plan.requiresAuth &&
              !isAuthenticated &&
              currentPlan !== planKey && (
                <div className="mt-2 text-xs text-orange-600 text-center">
                  このプランを選択すると自動的にログイン画面に移動します
                </div>
              )}
          </div>
        ))}
      </div>

      {/* 注意事項 */}
      <div className="mt-6 p-3 bg-yellow-50 rounded-lg">
        <div className="text-xs text-yellow-800">
          <div className="font-bold mb-1">📝 プラン変更について</div>
          <ul className="space-y-1">
            <li>• フリープランは認証なしで利用可能</li>
            <li>• 有料プランはGoogleアカウント認証が必要</li>
            <li>• アップグレードは即座に反映されます</li>
            <li>• ダウングレードは次回更新日から適用</li>
          </ul>
        </div>
      </div>

      {/* 競合比較 */}
      <div className="mt-6 p-4 bg-purple-50 rounded-lg">
        <div className="text-center">
          <div className="font-bold text-sm mb-2">💰 他社との比較</div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>
              📊 LINE占い（¥2,550）より <strong>62%安い</strong>
            </div>
            <div>
              🎯 Rint（¥400/¥960）に <strong>AI対話付きで差別化</strong>
            </div>
            <div>
              ✨ 神秘のタロット（買い切り）より <strong>継続的体験</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlansPage;
