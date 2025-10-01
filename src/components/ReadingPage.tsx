import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MasterData } from "../types";

interface ReadingPageProps {
  spreadId: string;
  categoryId: string;
  masterData: MasterData;
  onBack: () => void;
}

const ReadingPage: React.FC<ReadingPageProps> = ({
  spreadId,
  categoryId,
  masterData,
  onBack,
}) => {
  // テスト用の初期メッセージ（5-6個）
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "こんにちは。私はClaudia、あなたの運命を読み解く占い師です。今日はどのようなことを占いましょうか?",
      isTyping: false,
    },
    {
      role: "user",
      content: "最近、仕事で悩んでいます。転職すべきか迷っています。",
      isTyping: false,
    },
    {
      role: "assistant",
      content:
        "お仕事のことでお悩みなのですね。カードがあなたの状況を教えてくれます。現在のあなたには「愚者」のカードが出ています。これは新しい始まりと可能性を示しています。",
      isTyping: false,
    },
    {
      role: "user",
      content: "新しい始まり...確かに変化が必要な気がしています。",
      isTyping: false,
    },
    {
      role: "assistant",
      content:
        "そうですね。課題として「魔術師」が横向きに現れています。これは現在のスキルをどう活用するかが鍵となることを示しています。転職する・しないよりも、あなた自身の能力をどう発揮するかが重要なポイントです。",
      isTyping: false,
    },
    {
      role: "user",
      content: "なるほど...もう少し詳しく教えてください。",
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 選択されたスプレッドとカテゴリの情報を取得
  const selectedSpread = masterData.spreads?.find((s) => s.id === spreadId);
  const selectedCategory = masterData.categories?.find(
    (c) => c.id === categoryId
  );

  // 広告の有無を判定（bodyのクラスから）
  const hasAds = document.body.classList.contains("with-ads");

  // チャットエリアの高さを計算
  // 画面全体(100vh) - ヘッダー(56px) - フッター(70px) - 広告(40px if with-ads) - 戻るボタン(40px) - タロットボード(332px) - マージン(20px)
  const chatHeight = hasAds
    ? "calc(100vh - 56px - 70px - 40px - 40px - 332px - 20px)" // 広告あり: 約442px
    : "calc(100vh - 56px - 70px - 40px - 332px - 20px)"; // 広告なし: 約482px

  // クロスカードのアニメーション(3秒ごとに入れ替え)
  useEffect(() => {
    const interval = setInterval(() => {
      setCrossFlipped((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // ページ読み込み時に最上部にスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // メッセージ追加時に最下部にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingMessage]);

  // タロットカードのグリッド配置(ケルト十字)
  const tarotCards = [
    {
      id: 1,
      number: 1,
      gridX: 1,
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
      gridX: 1,
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
      gridX: 1,
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
      gridX: 0,
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
      gridX: 1,
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
      gridX: 2,
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
      gridX: 3,
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
      gridX: 3,
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
      gridX: 3,
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
      gridX: 3,
      gridY: 3,
      rotation: 0,
      name: "隠者",
      color: "bg-gray-400",
      position: "最終結果",
      description: "最終的な結末や答え",
    },
  ];

  // グリッドの最大列数・行数を計算
  const gridCols = Math.max(...tarotCards.map((c) => c.gridX ?? 0)) + 1;
  const gridRows = Math.max(...tarotCards.map((c) => c.gridY ?? 0)) + 1;

  // 4x4表示エリア分の高さを計算
  const cardSize = 60;
  const colGap = 6;
  const rowGap = 12;
  const visibleCols = 4;
  const visibleRows = 4;
  const visibleAreaWidth = cardSize * visibleCols + colGap * (visibleCols + 1);
  const visibleAreaHeight = cardSize * visibleRows + rowGap * (visibleRows + 1);

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
        "カードが示しています...素晴らしいエネルギーを感じます。あなたの直感に従うことが大切です。";
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
    戦車: "🛡️",
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
    <div className="main-container">
      {/* 戻るボタン + カテゴリ表示 */}
      {/* <div className="flex items-center justify-start mb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-purple-700 hover:text-purple-900 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">戻る</span>
        </button>
        {selectedCategory && (
          <div className="ml-3 text-xs text-purple-600 font-medium">
            {selectedCategory.name}
          </div>
        )}
      </div> */}

      {/* タロットボードエリア */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 border border-purple-200 shadow-md mb-3">
        <div className="flex gap-2">
          {/* カード配置グリッド(左側) */}
          <div
            className="flex-shrink-0 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-2 border border-purple-200"
            style={{
              width: `${visibleAreaWidth}px`,
              height: `${visibleAreaHeight}px`,
              overflowY: gridRows > visibleRows ? "auto" : "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${gridCols}, 60px)`,
                gridTemplateRows: `repeat(${gridRows}, 60px)`,
                columnGap: `${colGap}px`,
                rowGap: `${rowGap}px`,
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
                    className={`relative w-11 h-16 ${card.color} rounded border border-amber-600 shadow-md flex flex-col items-center justify-center p-0.5 hover:scale-105 transition-transform cursor-pointer`}
                  >
                    <div className="absolute -top-1 -left-1 w-4 h-4 bg-purple-600 text-white text-[7px] font-bold rounded-full flex items-center justify-center">
                      {card.number}
                    </div>
                    <div className="text-base">{cardIcons[card.name]}</div>
                    <div className="text-[6px] font-bold text-gray-800 text-center leading-tight">
                      {card.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 位置情報リスト(右側) */}
          <div
            className="flex-1 bg-white rounded-lg border border-purple-200 flex flex-col"
            style={{ height: `${visibleAreaHeight}px` }}
          >
            <div className="p-1 border-b border-purple-200 flex-shrink-0">
              <div className="text-[9px] font-bold text-purple-900 text-center">
                位置の意味
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="">
                {tarotCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className="w-full bg-purple-50 hover:bg-purple-100 rounded p-1 border border-purple-200 transition-colors text-left"
                  >
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-purple-600 text-white text-[7px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
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
              <h3 className="text-base font-bold text-purple-900">
                {selectedCard.position}
              </h3>
            </div>
            <div className="text-sm text-gray-700 mb-2">
              カード: <span className="font-semibold">{selectedCard.name}</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {selectedCard.description}
            </p>
            <button
              onClick={() => setSelectedCard(null)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 font-medium transition-colors text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* チャットエリア - 固定高さ */}
      <div
        className="bg-white/90 backdrop-blur-sm rounded-xl border border-purple-200 shadow-md flex flex-col"
        style={{ height: chatHeight }}
      >
        {/* ヘッダー */}
        <div className="p-2 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-sm border border-purple-300 shadow-sm">
              👸
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-xs">Claudia</h3>
              <p className="text-[9px] text-gray-500">タロット占い師</p>
            </div>
          </div>
        </div>

        {/* メッセージエリア - スクロール可能な固定エリア */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
          {messages.map((message, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-shrink-0">
                {message.role === "assistant" ? (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xs border border-purple-300">
                    👸
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-xs border border-blue-300">
                    👤
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-800 leading-relaxed">
                  {message.content}
                </div>
              </div>
            </div>
          ))}

          {/* タイピング中のメッセージ */}
          {isTyping && (
            <div className="flex gap-2">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xs border border-purple-300">
                  👸
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-800 leading-relaxed">
                  {typingMessage}
                  <span className="animate-pulse">▊</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div className="p-2 border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-1.5 items-end">
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
              className="flex-1 resize-none bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:opacity-50 text-white rounded-lg p-1.5 transition-colors flex-shrink-0"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingPage;
