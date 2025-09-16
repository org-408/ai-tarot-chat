import { PageType } from "../types";

interface HistoryPageProps {
  onNavigate: (page: PageType) => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigate }) => {
  // 仮の占い履歴データ
  const mockHistory = [
    {
      id: 1,
      date: "2024-01-15",
      time: "14:30",
      genre: "恋愛運",
      spread: "恋愛三角",
      result:
        "新しい出会いの予感があります。積極的に行動することで良い結果を得られるでしょう。",
      cards: ["愚者", "恋人", "太陽"],
    },
    {
      id: 2,
      date: "2024-01-14",
      time: "09:15",
      genre: "仕事運",
      spread: "3枚引き",
      result:
        "新しいプロジェクトに取り組む好機です。創造性を活かして取り組みましょう。",
      cards: ["魔術師", "星", "世界"],
    },
    {
      id: 3,
      date: "2024-01-13",
      time: "20:45",
      genre: "今日の運勢",
      spread: "ワンカード",
      result:
        "今日は周囲の人との調和を大切にする日です。協力し合うことで成功につながります。",
      cards: ["節制"],
    },
  ];

  const formatDate = (dateStr: string, timeStr: string) => {
    const date = new Date(dateStr + "T" + timeStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "今日";
    if (diffDays === 1) return "昨日";
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
  };

  const getGenreIcon = (genre: string) => {
    switch (genre) {
      case "恋愛運":
        return "💕";
      case "仕事運":
        return "💼";
      case "今日の運勢":
        return "✨";
      case "金運":
        return "💰";
      case "健康運":
        return "🌿";
      default:
        return "🔮";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="max-w-md mx-auto p-4">
        {/* ヘッダー */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">📋 占い履歴</h1>
          <p className="text-sm text-gray-600">過去の占い結果を確認できます</p>
        </div>

        {/* 履歴がない場合の表示 */}
        {mockHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔮</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              まだ占い履歴がありません
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              占いを始めて、結果を記録しましょう！
            </p>
            <button
              onClick={() => onNavigate("reading")}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              🔮 占いを始める
            </button>
          </div>
        ) : (
          /* 履歴リスト */
          <div className="space-y-4">
            {mockHistory.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
              >
                {/* ヘッダー情報 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">
                      {getGenreIcon(item.genre)}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {item.genre}
                      </h3>
                      <p className="text-xs text-gray-500">{item.spread}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {formatDate(item.date, item.time)}
                    </p>
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                </div>

                {/* 使用されたカード */}
                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-1">使用したカード：</p>
                  <div className="flex flex-wrap gap-1">
                    {item.cards.map((card, index) => (
                      <span
                        key={index}
                        className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full"
                      >
                        {card}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 占い結果 */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {item.result}
                  </p>
                </div>

                {/* アクションボタン */}
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 bg-purple-100 text-purple-700 text-xs py-2 px-3 rounded-lg hover:bg-purple-200 transition-colors">
                    詳細を見る
                  </button>
                  <button className="flex-1 bg-pink-100 text-pink-700 text-xs py-2 px-3 rounded-lg hover:bg-pink-200 transition-colors">
                    同じ方法で占う
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* フィルター・ソート機能（将来的に） */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-sm text-blue-800 mb-2">
            💡 今後追加予定の機能
          </h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• ジャンル別フィルター</li>
            <li>• 日付範囲での検索</li>
            <li>• お気に入り占い結果の保存</li>
            <li>• 占い結果のPDF出力</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
