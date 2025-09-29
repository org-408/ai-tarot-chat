import { useState } from "react";
import { Genre } from "../types";

interface FreePageProps {
  onLogin: () => void;
  onUpgrade: (plan: "standard" | "premium") => void;
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  isLoggingIn: boolean;
}

const FreePage: React.FC<FreePageProps> = ({
  onLogin,
  onUpgrade,
  isAuthenticated,
  user,
  isLoggingIn,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>("恋愛運");
  const [selectedSpread, setSelectedSpread] = useState<string>("ワンカード");
  const [remainingReads] = useState<number>(3); // TODO: 実際の残り回数をサーバーから取得

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
      {/* ユーザー状態表示 */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600 text-center">
          {isAuthenticated && user ? (
            <div>
              <div className="font-bold text-green-600">
                ✅ ログイン済み: {user.email}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                フリープラン登録済み
              </div>
            </div>
          ) : (
            <div>
              <div className="font-bold text-blue-600">
                🔓 フリープラン未登録
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ログインで履歴保存・アップグレードが可能
              </div>
            </div>
          )}
        </div>
      </div>

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

      {/* ログインセクション */}
      {!isAuthenticated && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <div className="font-bold text-blue-800 mb-2">
              🔑 アカウント作成
            </div>
            <div className="text-sm text-blue-600 mb-3">
              ログインすることで：
              <br />
              • 占い履歴の保存
              <br />
              • 有料プランへのアップグレード
              <br />• パーソナライズされた占い体験
            </div>
            <button
              onClick={onLogin}
              disabled={isLoggingIn}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isLoggingIn ? "認証中..." : "ユーザー登録してもっと楽しむ"}
            </button>
          </div>
        </div>
      )}

      {/* プラン変更ボタン（簡潔版） */}
      <div className="mt-6 space-y-2">
        <button
          onClick={() => onUpgrade("standard")}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          スタンダードプランにアップグレード (¥480/月)
        </button>
        <button
          onClick={() => onUpgrade("premium")}
          className="w-full py-2 px-4 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 transition-colors"
        >
          プレミアムプランにアップグレード (¥980/月)
        </button>
      </div>
    </div>
  );
};

export default FreePage;
