import { useState } from "react";
import { RemainingReadings } from "../../shared/lib/types";
import { Genre, UserPlan } from "../types";

interface StandardPageProps {
  onUpgrade: (plan: UserPlan) => void;
  onDowngrade: (plan: UserPlan) => void;
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  isLoggingIn: boolean;
  remainingReadings: RemainingReadings;
}

interface SpreadOption {
  id: string;
  name: string;
  description: string;
}

const StandardPage: React.FC<StandardPageProps> = ({
  onUpgrade,
  onDowngrade,
  isAuthenticated,
  user,
  isLoggingIn,
  remainingReadings,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>("恋愛・人間関係");
  const [selectedSpread, setSelectedSpread] = useState<string>("恋愛三角");

  const genres: Genre[] = [
    {
      id: "恋愛・人間関係",
      name: "💕 恋愛・人間関係",
      description: "恋愛・出会い・パートナーシップ・人間関係",
    },
    {
      id: "仕事・キャリア",
      name: "💼 仕事・キャリア",
      description: "転職・昇進・職場関係・スキルアップ",
    },
    {
      id: "金運・投資",
      name: "💰 金運・投資",
      description: "金運・投資・副業・節約・財政管理",
    },
    {
      id: "健康・ウェルネス",
      name: "🌿 健康・ウェルネス",
      description: "心身の健康・ストレス・生活習慣",
    },
    {
      id: "総合運・人生",
      name: "✨ 総合運・人生",
      description: "人生全般・今日の運勢・将来",
    },
  ];

  const spreadCategories: Record<string, Record<string, SpreadOption[]>> = {
    簡単占い: {
      基本: [
        { id: "ワンカード", name: "ワンカード", description: "1枚で即答" },
        { id: "3枚引き", name: "3枚引き", description: "過去・現在・未来" },
      ],
    },
    恋愛専用: {
      関係性: [
        {
          id: "恋愛三角",
          name: "恋愛三角",
          description: "心の状態・現在の愛・未来の愛",
        },
        {
          id: "関係性占い",
          name: "関係性占い",
          description: "あなた・相手・関係性を詳しく",
        },
      ],
    },
    問題解決: {
      総合: [
        {
          id: "5枚スプレッド",
          name: "5枚スプレッド",
          description: "現在・課題・過去・未来・アドバイス",
        },
        {
          id: "面接占い",
          name: "面接占い",
          description: "強み・印象・結果を予測",
        },
      ],
    },
  };

  const getAvailableSpreads = (): Record<string, SpreadOption[]> => {
    switch (selectedGenre) {
      case "恋愛・人間関係":
        return {
          簡単占い: spreadCategories["簡単占い"]["基本"],
          恋愛専用: spreadCategories["恋愛専用"]["関係性"],
          問題解決: [spreadCategories["問題解決"]["総合"][0]], // 5枚スプレッドのみ
        };
      case "仕事・キャリア":
        return {
          簡単占い: spreadCategories["簡単占い"]["基本"],
          問題解決: spreadCategories["問題解決"]["総合"],
          キャリア専用: [
            {
              id: "キャリアパス",
              name: "キャリアパス",
              description: "現状・課題・強み・長期目標",
            },
            {
              id: "ワークライフバランス",
              name: "ワークライフバランス",
              description: "仕事・プライベート・バランス",
            },
          ],
        };
      case "金運・投資":
        return {
          簡単占い: spreadCategories["簡単占い"]["基本"],
          金運専用: [
            {
              id: "金運予測",
              name: "金運予測",
              description: "現状・収入・支出・投資運・節約・金運",
            },
            {
              id: "マネーブロック",
              name: "マネーブロック解除",
              description: "金銭的ブロックを解除",
            },
          ],
        };
      case "健康・ウェルネス":
        return {
          簡単占い: spreadCategories["簡単占い"]["基本"],
          健康専用: [
            {
              id: "健康チェック",
              name: "健康チェック",
              description: "心・体・行動・回復の兆し",
            },
            {
              id: "心身バランス",
              name: "心身バランス",
              description: "心・体・魂のバランス",
            },
          ],
        };
      default:
        return {
          簡単占い: spreadCategories["簡単占い"]["基本"],
        };
    }
  };

  const availableSpreads = getAvailableSpreads();

  const handleStartReading = () => {
    // TODO: 占い開始処理
    console.log(`開始: ${selectedGenre} - ${selectedSpread}`);
  };

  const handleGenreChange = (genreId: string) => {
    setSelectedGenre(genreId);
    // ジャンル変更時にデフォルトスプレッドを設定
    const newAvailableSpreads = Object.values(getAvailableSpreads())[0];
    if (newAvailableSpreads && newAvailableSpreads.length > 0) {
      setSelectedSpread(newAvailableSpreads[0].id);
    }
  };

  return (
    <div className="main-container">
      {/* 認証済みプラン表示 */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-center">
          <div className="font-bold text-blue-800">💎 スタンダードプラン</div>
          <div className="text-sm text-blue-600">認証済み・無制限利用</div>
        </div>
      </div>

      {/* ジャンル選択 */}
      <div className="mb-6">
        <div className="section-title">🎯 占いたいジャンルを選択：</div>
        <div className="space-y-2">
          {genres.map((genre) => (
            <div
              key={genre.id}
              className={`option-item ${
                selectedGenre === genre.id ? "selected" : ""
              }`}
              onClick={() => handleGenreChange(genre.id)}
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

      {/* スプレッド選択 */}
      <div className="mb-6">
        <div className="section-title">🎴 詳細な占い方：</div>
        <div className="space-y-4">
          {Object.entries(availableSpreads).map(([category, spreads]) => (
            <div key={category}>
              <div className="section-subtitle">【{category}】</div>
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
          ))}
        </div>
      </div>

      {/* 占い開始ボタン */}
      <button className="primary-button" onClick={handleStartReading}>
        🔮 占いを始める
      </button>

      {/* アップグレードヒント */}
      <div className="upgrade-hint">🤖 AIと対話しながら占うには→プレミアム</div>

      {/* プラン変更ボタン（簡潔版） */}
      <div className="mt-6 space-y-2">
        <button
          onClick={() => onUpgrade("PREMIUM")}
          className="w-full py-2 px-4 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 transition-colors"
        >
          プレミアムプランにアップグレード (¥980/月)
        </button>
        <button
          onClick={() => onDowngrade("FREE")}
          className="w-full py-2 px-4 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
        >
          フリープランにダウングレード
        </button>
      </div>
    </div>
  );
};

export default StandardPage;
