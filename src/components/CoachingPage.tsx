import { useEffect, useState } from "react";
import { PlanFeatures, Spread, SpreadRecommendation, UserPlan } from "../types";

interface CoachingPageProps {
  features: PlanFeatures;
  onDowngrade: (plan: UserPlan) => void;
}

const CoachingPage: React.FC<CoachingPageProps> = ({
  features,
  onDowngrade,
}) => {
  const [userInput, setUserInput] =
    useState<string>("転職すべきか悩んでいます");
  const [selectionMode, setSelectionMode] = useState<string>("ai-auto");
  const [candidateCount, setCandidateCount] = useState<string>("1");
  const [selectedSpread, setSelectedSpread] = useState<string>("");
  const [aiRecommendations, setAiRecommendations] = useState<
    SpreadRecommendation[]
  >([]);
  const [favoritesSpreads] = useState<string[]>([
    "celtic-cross",
    "love-triangle",
  ]);

  const allSpreads: Spread[] = [
    {
      id: "one-card",
      name: "ワンカード",
      category: "初心者",
      description: "今日のメッセージ・即答・瞑想テーマ",
    },
    {
      id: "three-card-ppf",
      name: "3枚引き（Past/Present/Future）",
      category: "初心者",
      description: "過去・現在・未来",
    },
    {
      id: "three-card-sao",
      name: "3枚引き（Situation/Action/Outcome）",
      category: "初心者",
      description: "状況・行動・結果",
    },
    {
      id: "interview",
      name: "面接スプレッド",
      category: "初心者",
      description: "あなたの強み・相手の印象・結果",
    },
    {
      id: "mind-body-spirit",
      name: "3枚引き（Mind/Body/Spirit）",
      category: "中級",
      description: "心・体・魂",
    },
    {
      id: "love-triangle",
      name: "恋愛三角",
      category: "中級",
      description: "心の状態・現在の愛・未来の愛",
    },
    {
      id: "health-check",
      name: "健康チェック",
      category: "中級",
      description: "心の健康・体の健康・必要な行動・回復の兆し",
    },
    {
      id: "five-card",
      name: "5枚スプレッド",
      category: "中級",
      description: "現在・課題・過去・未来・アドバイス",
    },
    {
      id: "reconciliation",
      name: "復縁スプレッド",
      category: "中級",
      description: "過去の関係・現在・相手の気持ち・復縁可能性",
    },
    {
      id: "money-forecast",
      name: "金運予測",
      category: "中級",
      description: "現状・収入・支出・投資運・節約法・金運",
    },
    {
      id: "soulmate",
      name: "ソウルメイト",
      category: "中級",
      description: "現状・準備度・出会い方・相手像・出会う時期",
    },
    {
      id: "money-block",
      name: "マネーブロック解除",
      category: "中級",
      description: "現状・原因・ブロック・解決法・成功後",
    },
    {
      id: "career-path",
      name: "キャリアパス",
      category: "中級",
      description: "現状・課題・強み・長期目標・行動・機会・結果",
    },
    {
      id: "work-life-balance",
      name: "ワークライフバランス",
      category: "中級",
      description: "現状・仕事・バランス・プライベート・未来",
    },
    {
      id: "relationship",
      name: "関係性スプレッド",
      category: "上級",
      description: "あなた・相手・関係性",
    },
    {
      id: "relationship-health",
      name: "関係性ヘルスチェック",
      category: "上級",
      description: "あなた・パートナー・強み・課題・アドバイス・未来",
    },
    {
      id: "psychological-block",
      name: "心のブロック解除",
      category: "上級",
      description: "現状・原因・ブロック・解決法・成功後",
    },
    {
      id: "healing-journey",
      name: "ヒーリングジャーニー",
      category: "上級",
      description: "現状・原因・治療法・心の癒し・体の癒し・回復",
    },
    {
      id: "energy-balance",
      name: "エナジーバランス",
      category: "上級",
      description: "現状・精神・肉体・行動・栄養・運動・バランス",
    },
    {
      id: "investment",
      name: "投資スプレッド",
      category: "上級",
      description: "リスク・リターン・タイミング・結果",
    },
    {
      id: "horseshoe",
      name: "ホースシュー",
      category: "最上級",
      description: "過去・現在・未来・アプローチ・周囲・障害・結果",
    },
    {
      id: "celtic-cross",
      name: "ケルト十字",
      category: "最上級",
      description:
        "現在・課題・遠い過去・近い過去・可能な未来・近い未来・アプローチ・周囲・内面・最終結果",
    },
  ];

  // AIが自動でスプレッドを推奨する処理（モック）
  useEffect(() => {
    if (selectionMode === "ai-auto" && userInput.trim()) {
      // 簡単なキーワードマッチングでスプレッドを推奨
      const keywords = userInput.toLowerCase();
      let recommendations: SpreadRecommendation[] = [];

      if (
        keywords.includes("転職") ||
        keywords.includes("仕事") ||
        keywords.includes("キャリア")
      ) {
        recommendations.push({
          id: "career-path",
          name: "📊 キャリアパス",
          description: "転職という重要な決断を総合的に占います",
          reason:
            "転職に関する悩みには、現状・課題・強み・長期目標を総合的に見ることが重要です",
        });
      }

      if (
        keywords.includes("恋愛") ||
        keywords.includes("恋人") ||
        keywords.includes("彼") ||
        keywords.includes("彼女")
      ) {
        recommendations.push({
          id: "love-triangle",
          name: "💕 恋愛三角",
          description: "恋愛の心境から未来まで詳しく占います",
          reason:
            "恋愛の悩みには、あなたの心の状態・現在の愛・未来の愛を見ることが有効です",
        });
      }

      if (
        keywords.includes("お金") ||
        keywords.includes("金運") ||
        keywords.includes("投資")
      ) {
        recommendations.push({
          id: "money-forecast",
          name: "💰 金運予測",
          description: "金銭面の現状から未来まで幅広く占います",
          reason:
            "お金の悩みには、収入・支出・投資運を総合的に見ることが大切です",
        });
      }

      if (recommendations.length === 0) {
        recommendations.push({
          id: "celtic-cross",
          name: "🔮 ケルト十字",
          description: "人生全般の悩みを包括的に占います",
          reason: "複雑な悩みには、最も包括的なケルト十字が適しています",
        });
      }

      setAiRecommendations(recommendations.slice(0, parseInt(candidateCount)));
      if (recommendations.length > 0) {
        setSelectedSpread(recommendations[0].id);
      }
    }
  }, [userInput, candidateCount, selectionMode]);

  const handleStartCoaching = () => {
    // TODO: AIコーチング開始処理
    console.log(`開始: ${userInput} - ${selectedSpread}`);
  };

  const getFavoriteSpread = (spreadId: string): Spread | undefined => {
    return allSpreads.find((s) => s.id === spreadId);
  };

  const getFavoriteSpreadName = (spreadId: string): string => {
    const spread = getFavoriteSpread(spreadId);
    return spread ? spread.name : spreadId;
  };

  return (
    <div className="main-container">
      {/* ヘッダー */}
      <div className="page-title">🤖 AIタロットコーチング</div>

      {/* プラン情報 */}
      <div className="plan-info plan-coaching rounded-lg mb-6">
        <div className="font-bold text-lg text-white">👑 コーチングプラン</div>
        <div className="text-sm text-white opacity-90">¥980/月</div>
      </div>

      {/* ユーザー入力 */}
      <div className="mb-6">
        <div className="section-title">📝 どんなことを占いたいですか？</div>
        <input
          type="text"
          className="text-input"
          placeholder="例：彼との関係がうまくいくか知りたい"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
        />
      </div>

      {/* 占い方選択 */}
      <div className="mb-6">
        <div className="section-title">🎴 占い方を選んでください：</div>

        {/* AIおまかせ */}
        <div className="space-y-2">
          <div
            className={`option-item ${
              selectionMode === "ai-auto" ? "selected" : ""
            }`}
            onClick={() => setSelectionMode("ai-auto")}
          >
            <div
              className={`radio-button ${
                selectionMode === "ai-auto" ? "selected" : ""
              }`}
            ></div>
            <div>
              <div>🤖 AIおまかせ</div>
              <div className="text-xs text-gray-500">
                入力内容から最適なスプレッドを選択
              </div>
            </div>
          </div>

          {/* 動的表示エリア */}
          {selectionMode === "ai-auto" && (
            <div className="dynamic-ui">
              <div className="text-xs text-green-600 font-bold mb-2">
                ↓ 動的表示エリア ↓
              </div>

              {/* 候補個数選択 */}
              <div className="mb-3">
                <div className="font-bold text-sm mb-2">
                  🎯 候補個数を選択：
                </div>
                <div className="space-y-1">
                  <div
                    className={`option-item ${
                      candidateCount === "1" ? "selected" : ""
                    }`}
                    onClick={() => setCandidateCount("1")}
                  >
                    <div
                      className={`radio-button ${
                        candidateCount === "1" ? "selected" : ""
                      }`}
                    ></div>
                    <div>1個 (迷いたくない)</div>
                  </div>
                  <div
                    className={`option-item ${
                      candidateCount === "3" ? "selected" : ""
                    }`}
                    onClick={() => setCandidateCount("3")}
                  >
                    <div
                      className={`radio-button ${
                        candidateCount === "3" ? "selected" : ""
                      }`}
                    ></div>
                    <div>3個 (比較したい)</div>
                  </div>
                </div>
              </div>

              {/* AI推奨結果 */}
              {aiRecommendations.length > 0 && (
                <div className="ai-recommendations">
                  <div className="font-bold mb-2">✨ おすすめスプレッド</div>
                  <div className="space-y-2">
                    {aiRecommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className={`bg-white p-2 rounded cursor-pointer border-2 ${
                          selectedSpread === rec.id
                            ? "border-blue-500"
                            : "border-gray-200"
                        }`}
                        onClick={() => setSelectedSpread(rec.id)}
                      >
                        <div className="font-bold text-sm">{rec.name}</div>
                        <div className="text-xs text-gray-600 mb-1">
                          {rec.description}
                        </div>
                        <div className="text-xs text-blue-600">
                          理由: {rec.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* スプレッド手動選択 */}
          <div
            className={`option-item ${
              selectionMode === "manual" ? "selected" : ""
            }`}
            onClick={() => setSelectionMode("manual")}
          >
            <div
              className={`radio-button ${
                selectionMode === "manual" ? "selected" : ""
              }`}
            ></div>
            <div>🎯 スプレッド選択 (22種類から)</div>
          </div>

          {/* お気に入りスプレッド */}
          {favoritesSpreads.map((favId) => {
            const spread = getFavoriteSpread(favId);
            if (!spread) return null;

            return (
              <div
                key={spread.id}
                className={`option-item ${
                  selectionMode === spread.id ? "selected" : ""
                }`}
                onClick={() => {
                  setSelectionMode(spread.id);
                  setSelectedSpread(spread.id);
                }}
              >
                <div
                  className={`radio-button ${
                    selectionMode === spread.id ? "selected" : ""
                  }`}
                ></div>
                <div>⭐ {spread.name} (お気に入り)</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 手動選択時のスプレッド一覧 */}
      {selectionMode === "manual" && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="font-bold text-sm mb-3">
            🎴 全スプレッド一覧（22種類）
          </div>
          <div className="space-y-3">
            {["初心者", "中級", "上級", "最上級"].map((category) => (
              <div key={category}>
                <div className="text-xs font-bold text-gray-600 mb-1">
                  {category}
                </div>
                <div className="space-y-1">
                  {allSpreads
                    .filter((spread) => spread.category === category)
                    .map((spread) => (
                      <div
                        key={spread.id}
                        className={`option-item text-sm ${
                          selectedSpread === spread.id ? "selected" : ""
                        }`}
                        onClick={() => setSelectedSpread(spread.id)}
                      >
                        <div
                          className={`radio-button ${
                            selectedSpread === spread.id ? "selected" : ""
                          }`}
                        ></div>
                        <div>
                          <div>{spread.name}</div>
                          <div className="text-xs text-gray-500">
                            {spread.description}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* コーチング開始ボタン */}
      <button
        className="primary-button"
        onClick={handleStartCoaching}
        disabled={!selectedSpread}
      >
        🤖 コーチングを始める
      </button>

      {/* プラン変更ボタン（簡潔版） */}
      <div className="mt-6 space-y-2">
        <button
          onClick={() => onDowngrade("Standard")}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          スタンダードプランにダウングレード (¥480/月)
        </button>
        <button
          onClick={() => onDowngrade("Free")}
          className="w-full py-2 px-4 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
        >
          フリープランにダウングレード
        </button>
      </div>
    </div>
  );
};

export default CoachingPage;
