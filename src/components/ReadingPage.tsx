import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

const TarotReadingScreen = () => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "こんにちは。私はClaudia、あなたの運命を読み解く占い師です。今日はどのようなことを占いましょうか？",
      isTyping: false,
    },
    {
      role: "user",
      content: "最近、仕事で悩んでいることがあって...",
      isTyping: false,
    },
    {
      role: "assistant",
      content:
        "わかりました。仕事についてのお悩みですね。では、ケルト十字のスプレッドで占いましょう。カードを引いています...",
      isTyping: false,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [crossFlipped, setCrossFlipped] = useState(false);
  const [selectedCard, setSelectedCard] = useState<
    null | (typeof tarotCards)[number]
  >(null);
  const [typingMessage, setTypingMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // クロスカードのアニメーション（3秒ごとに入れ替え）
  useEffect(() => {
    const interval = setInterval(() => {
      setCrossFlipped((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // タロットカードのグリッド配置（ケルト十字）
  const tarotCards = [
    {
      id: 1,
      number: 1,
      gridX: 2,
      gridY: 2,
      rotation: 0,
      name: "愚者",
      color: "bg-yellow-200",
      position: "現在の状況",
      description: "あなたの現在の状態を示します",
    },
    {
      id: 2,
      number: 2,
      gridX: 2,
      gridY: 2,
      rotation: 90,
      name: "魔術師",
      color: "bg-yellow-200",
      position: "課題・障害",
      description: "現在直面している問題や妨げとなるもの",
    },
    {
      id: 3,
      number: 3,
      gridX: 2,
      gridY: 3,
      rotation: 0,
      name: "女教皇",
      color: "bg-blue-200",
      position: "基礎・原因",
      description: "状況の根本的な原因や土台",
    },
    {
      id: 4,
      number: 4,
      gridX: 1,
      gridY: 2,
      rotation: 0,
      name: "女帝",
      color: "bg-yellow-200",
      position: "過去",
      description: "過去の出来事や影響",
    },
    {
      id: 5,
      number: 5,
      gridX: 2,
      gridY: 1,
      rotation: 0,
      name: "皇帝",
      color: "bg-orange-200",
      position: "可能性",
      description: "起こりうる最良の展開",
    },
    {
      id: 6,
      number: 6,
      gridX: 3,
      gridY: 2,
      rotation: 0,
      name: "教皇",
      color: "bg-gray-300",
      position: "近い未来",
      description: "近い将来に起こること",
    },
    {
      id: 7,
      number: 7,
      gridX: 4,
      gridY: 0,
      rotation: 0,
      name: "恋人",
      color: "bg-yellow-200",
      position: "あなた自身",
      description: "この状況におけるあなたの立場",
    },
    {
      id: 8,
      number: 8,
      gridX: 4,
      gridY: 1,
      rotation: 0,
      name: "戦車",
      color: "bg-yellow-200",
      position: "周囲の影響",
      description: "環境や他者からの影響",
    },
    {
      id: 9,
      number: 9,
      gridX: 4,
      gridY: 2,
      rotation: 0,
      name: "力",
      color: "bg-yellow-200",
      position: "希望と恐れ",
      description: "あなたの願いと不安",
    },
    {
      id: 10,
      number: 10,
      gridX: 4,
      gridY: 3,
      rotation: 0,
      name: "隠者",
      color: "bg-gray-400",
      position: "最終結果",
      description: "最終的な結末や答え",
    },
  ];

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setMessages([
        ...messages,
        {
          role: "user",
          content: inputValue,
          isTyping: false,
        },
      ]);
      setInputValue("");

      // タイピングアニメーション付きで返信
      const responseText =
        "カードが示しています...素晴らしいエネルギーを感じます。";
      setIsTyping(true);
      setTypingMessage("");

      let index = 0;
      const typingInterval = setInterval(() => {
        if (index < responseText.length) {
          setTypingMessage(responseText.slice(0, index + 1));
          index++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: responseText,
              isTyping: false,
            },
          ]);
          setTypingMessage("");
        }
      }, 30);
    }
  };

  const cardIcons: { [key: string]: string } = {
    愚者: "🤹",
    魔術師: "🪄",
    女教皇: "🌙",
    女帝: "👑",
    皇帝: "⚜️",
    教皇: "🔑",
    恋人: "💕",
    戦車: "🏛️",
    力: "🦁",
    隠者: "🕯️",
  };

  // クロスカードのz-indexを決定
  const getZIndex = (cardNumber: number) => {
    if (cardNumber === 1) return crossFlipped ? 20 : 10;
    if (cardNumber === 2) return crossFlipped ? 10 : 20;
    return 5;
  };

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 overflow-hidden flex flex-col">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        {/* タロットボードエリア */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-3 border-2 border-purple-300/50 shadow-2xl flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-purple-900 flex items-center gap-1">
              <span className="text-xl">🔮</span>
              ケルト十字
            </h2>
          </div>

          {/* ボードエリア：グリッド + 位置情報リスト */}
          <div className="flex gap-2">
            {/* カード配置グリッド（左側70%） */}
            <div className="flex-1 bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-xl p-2 border-2 border-purple-300/50">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 70px)",
                  gridTemplateRows: "repeat(4, 70px)",
                  gap: "3px",
                  justifyContent: "center",
                }}
              >
                {tarotCards.map((card) => (
                  <div
                    key={card.id}
                    style={{
                      gridColumn: card.gridX + 1,
                      gridRow: card.gridY + 1,
                      transform: `rotate(${card.rotation}deg)`,
                      transformOrigin: "center center",
                      zIndex: getZIndex(card.number),
                      transition: "z-index 0.5s ease-in-out",
                    }}
                    className="flex items-center justify-center"
                  >
                    <div
                      className={`relative w-11 h-16 ${card.color} rounded border-2 border-amber-600 shadow-lg flex flex-col items-center justify-center p-0.5 hover:scale-110 transition-transform cursor-pointer`}
                    >
                      {/* カード番号 */}
                      <div className="absolute -top-1 -left-1 w-4 h-4 bg-purple-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                        {card.number}
                      </div>
                      <div className="text-lg">{cardIcons[card.name]}</div>
                      <div className="text-[5px] font-bold text-gray-800 text-center">
                        {card.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 位置情報リスト（右側30%） - スクロール可能 */}
            <div className="w-28 bg-white/60 rounded-xl border border-purple-300/50 flex flex-col">
              <div className="p-2 border-b border-purple-300/50 flex-shrink-0">
                <div className="text-[9px] font-bold text-purple-900 text-center">
                  位置の意味
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1.5">
                  {tarotCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => setSelectedCard(card)}
                      className="w-full bg-purple-50 hover:bg-purple-100 rounded p-1.5 border border-purple-200 transition-colors text-left overflow-x-auto"
                    >
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <div className="w-3.5 h-3.5 bg-purple-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                          {card.number}
                        </div>
                        <div className="text-[10px] font-semibold text-purple-900 leading-tight">
                          {card.position}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ポップアップモーダル */}
          {selectedCard && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedCard(null)}
            >
              <div
                className="bg-white rounded-2xl p-4 max-w-xs w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-purple-600 text-white text-sm font-bold rounded-full flex items-center justify-center">
                    {selectedCard.number}
                  </div>
                  <h3 className="text-lg font-bold text-purple-900">
                    {selectedCard.position}
                  </h3>
                </div>
                <div className="text-sm text-gray-700 mb-2">
                  カード：
                  <span className="font-semibold">{selectedCard.name}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  {selectedCard.description}
                </p>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 font-medium transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}
        </div>

        {/* チャットエリア */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border-2 border-purple-300/50 shadow-2xl flex flex-col flex-1 min-h-0">
          {/* ヘッダー */}
          <div className="p-3 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-lg border-2 border-purple-300 shadow-md">
                👸
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Claudia</h3>
                <p className="text-xs text-gray-500">タロット占い師</p>
              </div>
            </div>
          </div>

          {/* メッセージエリア */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((message, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-shrink-0">
                  {message.role === "assistant" ? (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-base border-2 border-purple-300 shadow-md">
                      👸
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-base border-2 border-blue-300 shadow-md">
                      👤
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 leading-relaxed">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}

            {/* タイピング中のメッセージ */}
            {isTyping && (
              <div className="flex gap-2">
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-base border-2 border-purple-300 shadow-md">
                    👸
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 leading-relaxed">
                    {typingMessage}
                    <span className="animate-pulse">▊</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 入力エリア */}
          <div className="p-3 border-t border-gray-200 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="メッセージを入力..."
                rows={2}
                className="flex-1 resize-none bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:opacity-50 text-gray-700 rounded-xl p-2 transition-colors"
              >
                <ArrowUp size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TarotReadingScreen;
