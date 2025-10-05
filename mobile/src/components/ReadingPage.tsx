import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TarotDeck, TarotCard, DrawnCard } from "../../../shared/lib/types";
import { useMaster } from "../lib/hooks/useMaster";

interface ReadingPageProps {
  spreadId: string;
  categoryId: string;
  onBack: () => void;
}

// カード配置情報の型
interface CardPlacement {
  id: string;
  number: number;
  gridX: number;
  gridY: number;
  rotation: number;
  card: TarotCard;
  isReversed: boolean;
  position: string;
  description: string;
}

const ReadingPage: React.FC<ReadingPageProps> = ({
  spreadId,
  categoryId,
  onBack,
}) => {
  const { data: masterData, isLoading: masterLoading } = useMaster();

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
  const [selectedCard, setSelectedCard] = useState<CardPlacement | null>(null);
  const [typingMessage, setTypingMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [drawnCards, setDrawnCards] = useState<CardPlacement[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputFocus = () => {
    setIsInputFocused(true);
  };
  const handleInputBlur = () => {
    setIsInputFocused(false);
  };

  // カードをランダムに引く関数
  const drawRandomCards = (
    allCards: TarotCard[],
    spreadCells: any[],
    count: number
  ): CardPlacement[] => {
    // カードをシャッフル
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    return spreadCells.map((cell, index) => {
      const card = selected[index];
      const isReversed = Math.random() > 0.5; // 50%の確率で逆位置
      
      return {
        id: `${card.id}-${index}`,
        number: (cell.vOrder || cell.hOrder || index) + 1,
        gridX: cell.x,
        gridY: cell.y,
        rotation: cell.hLabel ? 90 : 0, // 横向きラベルがあれば90度回転
        card,
        isReversed,
        position: cell.vLabel || cell.hLabel || `位置${index + 1}`,
        description: `${cell.vLabel || cell.hLabel}の意味を示します`,
      };
    });
  };

  // カード画像パスを生成
  const getCardImagePath = (card: TarotCard): string => {
    return `/cards/${card.code}.jpg`;
  };

  // ローディング中
  if (masterLoading || !masterData) {
    return (
      <div className="main-container">
        <div className="text-center py-20">読み込み中...</div>
      </div>
    );
  }

  const selectedSpread = masterData.spreads?.find((s: { id: string; }) => s.id === spreadId);
  const selectedCategory = masterData.categories?.find(
    (c: { id: string; }) => c.id === categoryId
  );

  // カードを引く（初回のみ）
  // TODO: 依存配列の見直し[0] -> [selectedDeck]
  useEffect(() => {
    if (masterData.decks![0].cards && selectedSpread?.cells && drawnCards.length === 0) {
      const cards = drawRandomCards(
        masterData.decks![0].cards,
        selectedSpread.cells,
        selectedSpread.cells.length
      );
      setDrawnCards(cards);
    }
  }, [masterData.decks![0].cards, selectedSpread, drawnCards.length]);

  const chatHeight = "calc(100vh - 56px - 70px - 40px - 332px - 20px)";

  useEffect(() => {
    const interval = setInterval(() => {
      setCrossFlipped((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingMessage]);

  // グリッドサイズを計算
  const gridCols = drawnCards.length > 0 
    ? Math.max(...drawnCards.map((c) => c.gridX)) + 1 
    : 4;
  const gridRows = drawnCards.length > 0
    ? Math.max(...drawnCards.map((c) => c.gridY)) + 1
    : 4;

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

  const getZIndex = (cardNumber: number) => {
    // クロス配置の場合のz-index制御
    const crossCards = drawnCards.filter(c => c.rotation === 90 || c.rotation === 0);
    if (crossCards.length >= 2) {
      if (cardNumber === crossCards[0].number) return crossFlipped ? 20 : 10;
      if (cardNumber === crossCards[1].number) return crossFlipped ? 10 : 20;
    }
    return 5;
  };

  // カード画像コンポーネント
  const TarotCardImage: React.FC<{ placement: CardPlacement }> = ({ placement }) => {
    return (
      <div className="relative w-11 h-16 hover:scale-105 transition-transform cursor-pointer">
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-purple-600 text-white text-[7px] font-bold rounded-full flex items-center justify-center z-10">
          {placement.number}
        </div>
        <img
          src={getCardImagePath(placement.card)}
          alt={placement.card.name}
          className={`w-full h-full object-cover rounded border-2 shadow-md ${
            placement.isReversed 
              ? 'border-red-500 transform rotate-180' 
              : 'border-amber-600'
          }`}
          style={{
            transform: placement.isReversed ? 'rotate(180deg)' : 'none',
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        {/* フォールバック表示 */}
        <div className="hidden w-full h-full bg-purple-100 rounded border-2 border-amber-600 shadow-md flex-col items-center justify-center p-0.5">
          <div className="text-base">{placement.card.type === 'major' ? '🌟' : '🎴'}</div>
          <div className="text-[6px] font-bold text-gray-800 text-center leading-tight">
            {placement.card.name}
          </div>
          {placement.isReversed && (
            <div className="text-[6px] text-red-600">逆位置</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="main-container">
      {!isInputFocused && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 border border-purple-200 shadow-md mb-3">
          <div className="flex gap-2">
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
                {drawnCards.map((placement) => (
                  <div
                    key={placement.id}
                    style={{
                      gridColumn: placement.gridX + 1,
                      gridRow: placement.gridY + 1,
                      transform: `rotate(${placement.rotation}deg)`,
                      transformOrigin: "center center",
                      zIndex: getZIndex(placement.number),
                      transition: "z-index 0.5s ease-in-out",
                    }}
                    className="flex items-center justify-center"
                  >
                    <TarotCardImage placement={placement} />
                  </div>
                ))}
              </div>
            </div>

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
                  {drawnCards.map((placement) => (
                    <button
                      key={placement.id}
                      onClick={() => setSelectedCard(placement)}
                      className="w-full bg-purple-50 hover:bg-purple-100 rounded p-1 border border-purple-200 transition-colors text-left"
                    >
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-purple-600 text-white text-[7px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                          {placement.number}
                        </div>
                        <div className="text-[10px] font-semibold text-purple-900 leading-tight">
                          {placement.position}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
              カード: <span className="font-semibold">{selectedCard.card.name}</span>
              {selectedCard.isReversed && (
                <span className="text-red-600 ml-2">(逆位置)</span>
              )}
            </div>
            <div className="text-xs text-gray-600 mb-2">
              キーワード: {selectedCard.isReversed 
                ? selectedCard.card.reversedKeywords.join('、')
                : selectedCard.card.uprightKeywords.join('、')}
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

      <div
        className="bg-white/90 backdrop-blur-sm rounded-xl border border-purple-200 shadow-md flex flex-col"
        style={{ height: chatHeight }}
      >
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

        <div className="p-2 border-gray-200 flex-shrink-0">
          <div className="flex gap-1.5 items-end">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="メッセージを入力..."
              rows={2}
              className="flex-1 resize-none bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-transparent shadow-lg p-4 focus:shadow-xl"
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