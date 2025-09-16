import { useState } from "react";
import { Genre, PlanFeatures, UserPlan } from "../types";

interface FreePageProps {
  features: PlanFeatures;
  onUpgrade: (plan: UserPlan) => void;
}

const FreePage: React.FC<FreePageProps> = ({ features, onUpgrade }) => {
  const [selectedGenre, setSelectedGenre] = useState<string>("恋愛運");
  const [selectedSpread, setSelectedSpread] = useState<string>("ワンカード");
  const [remainingReads] = useState<number>(features.free_count); // TODO: 実際の残り回数を取得

  const genres: Genre[] = [
    {
      id: "恋愛運",
      name: "💕 恋愛運",
      description: "恋愛・出会い・パートナーシップ",
    },
    { id: "仕事運", name: "💼 仕事運", description: "キャリア・職場・転職" },
    {
      id: "今日の運勢",
      name: "✨ 今日の運勢",
      description: "今日一日の総合運",
    },
  ];

  const spreads = [
    {
      id: "ワンカード",
      name: "ワンカード (シンプル)",
      description: "1枚のカードで即答",
    },
    {
      id: "3枚引き",
      name: "3枚引き (詳しく)",
      description: "過去・現在・未来を見る",
    },
  ];

  const handleStartReading = () => {
    // TODO: 占い開始処理
    console.log(`開始: ${selectedGenre} - ${selectedSpread}`);
  };

  return (
    <div className="main-container">
      {/* ヘッダー -> 共通化して省略 */}

      {/* プラン情報 -> 共通化して省略 */}

      {/* 残り回数表示 */}
      <div className="daily-limit mb-4">残り {remainingReads} 回</div>

      {/* ジャンル選択 */}
      <div className="mb-6">
        <div className="section-title">🎯 どのジャンルを占いますか？</div>
        <div className="space-y-2">
          {genres.map((genre) => (
            <div
              key={genre.id}
              className={`option-item ${
                selectedGenre === genre.id ? "selected" : ""
              }`}
              onClick={() => setSelectedGenre(genre.id)}
            >
              <div
                className={`radio-button ${
                  selectedGenre === genre.id ? "selected" : ""
                }`}
              ></div>
              <div>
                <div>{genre.name}</div>
                <div className="text-xs text-gray-500">{genre.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 占い方選択 */}
      <div className="mb-6">
        <div className="section-title">🎴 占い方：</div>
        <div className="space-y-2">
          {spreads.map((spread) => (
            <div
              key={spread.id}
              className={`option-item ${
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

      {/* 占い開始ボタン */}
      <button
        className="primary-button"
        onClick={handleStartReading}
        disabled={remainingReads <= 0}
      >
        🔮 占いを始める
      </button>

      {/* アップグレードヒント */}
      <div className="upgrade-hint">💎 もっと詳しく占うには→アップグレード</div>

      {/* プラン変更ボタン（簡潔版） */}
      <div className="mt-6 space-y-2">
        <button
          onClick={() => onUpgrade("Standard")}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          スタンダードプランにアップグレード (¥480/月)
        </button>
        <button
          onClick={() => onUpgrade("Coaching")}
          className="w-full py-2 px-4 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 transition-colors"
        >
          コーチングプランにアップグレード (¥980/月)
        </button>
      </div>
    </div>
  );
};

export default FreePage;
