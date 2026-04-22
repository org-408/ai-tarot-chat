import { useEffect, useMemo, useState } from "react";
import type {
  AppJWTPayload,
  DrawnCard,
  MasterData,
  Plan,
  ReadingCategory,
  Spread,
  UsageStats,
} from "../../../shared/lib/types";
import { useSalon } from "../lib/hooks/use-salon";
import type { UserPlan } from "../types";
import { ChatPanel } from "./chat-panel";
import SpreadViewerSwipe from "./spread-viewer-swipe";
import SwipeableContainer from "./swipeable-container";
import TarotistCarouselPortrait from "./tarotist-carousel-portrait";

/**
 * 実際のSalonPageとReadingPageのコンポーネントを使った
 * SwipeableContainerのデモ
 */
interface SwipeableDemoProps {
  payload: AppJWTPayload;
  masterData: MasterData;
  usageStats: UsageStats;
  currentPlan: Plan;
  onChangePlan: (plan: UserPlan) => void;
  isChangingPlan: boolean;
}

const SwipeableDemo: React.FC<SwipeableDemoProps> = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  payload,
  masterData,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  usageStats,
  currentPlan,
  onChangePlan,
  isChangingPlan,
}) => {
  const {
    selectedTargetMode,
    selectedTarotist,
    setSelectedTarotist,
    setSelectedTargetMode,
  } = useSalon();

  const [upperIndex, setUpperIndex] = useState(0);
  const [lowerIndex, setLowerIndex] = useState(0);

  // カテゴリ
  const availableCategories = useMemo(() => {
    return (masterData.categories || []).map((cat) => ({
      ...cat,
      bio: cat.description,
    }));
  }, [masterData]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedCategory, setSelectedCategory] =
    useState<ReadingCategory | null>(availableCategories[0] || null);

  // スプレッド
  const availableSpreads = useMemo(() => {
    if (!selectedCategory) return [];
    return (masterData.spreads || [])
      .filter((spread) => {
        if (!spread.plan || !spread.categories) return false;
        const spreadCategories = spread.categories.map(
          (stc) => stc.category?.name
        );
        return (
          currentPlan.no >= spread.plan.no &&
          spreadCategories.includes(selectedCategory.name)
        );
      })
      .map((spread) => ({ ...spread, bio: spread.guide }));
  }, [masterData, selectedCategory, currentPlan]);

  const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null);

  useEffect(() => {
    if (availableSpreads.length > 0 && !selectedSpread) {
      setSelectedSpread(availableSpreads[0]);
    }
  }, [availableSpreads, selectedSpread]);

  // 引いたカード
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [isRevealingComplete, setIsRevealingComplete] = useState(false);

  useEffect(() => {
    if (selectedSpread && masterData.decks?.[0]?.cards) {
      const cards = masterData.decks[0].cards;
      const shuffled = [...cards].sort(() => Math.random() - 0.5);
      const drawn: DrawnCard[] = (selectedSpread.cells || []).map(
        (cell, index) => {
          const card = shuffled[index];
          const isReversed = Math.random() > 0.5;
          return {
            id: `${card.id}-${index}`,
            x: cell.x,
            y: cell.y,
            order: cell.order || index + 1,
            position: cell.position || `位置${index + 1}`,
            description: cell.description || "",
            isHorizontal: cell.isHorizontal || false,
            isReversed,
            card,
            keywords: isReversed ? card.reversedKeywords : card.uprightKeywords,
            cardId: card.id,
            createdAt: new Date(),
          };
        }
      );
      setDrawnCards(drawn);
      setFlippedCards(new Set());
    }
  }, [selectedSpread, masterData]);

  useEffect(() => {
    if (flippedCards.size > 0 && flippedCards.size === drawnCards.length) {
      setIsRevealingComplete(true);
    }
  }, [flippedCards, drawnCards.length]);

  const handleChangePlan = (targetPlan: UserPlan) => {
    onChangePlan(targetPlan);
  };

  return (
    <div className="main-container">
      {/* 占い師選択モード */}
      {selectedTargetMode === "tarotist" ? (
        <TarotistCarouselPortrait
          masterData={masterData}
          currentPlan={currentPlan}
          selectedTarotist={selectedTarotist}
          onSelectTarotist={setSelectedTarotist}
          selectedMode={selectedTargetMode}
          onChangeMode={setSelectedTargetMode}
          onChangePlan={handleChangePlan}
          isChangingPlan={isChangingPlan}
        />
      ) : (
        <>
          {/* 上半分 */}
          <div
            className="fixed left-0 right-0 h-[45vh] z-10"
            style={{
              top: "calc(50px + env(safe-area-inset-top))",
            }}
          >
            <SwipeableContainer
              activeIndex={upperIndex}
              onIndexChange={setUpperIndex}
              showIndicators={true}
              showHint={true}
            >
              {/* ビュー1: 占い師肖像画 */}
              <TarotistCarouselPortrait
                masterData={masterData}
                currentPlan={currentPlan}
                selectedTarotist={selectedTarotist}
                onSelectTarotist={setSelectedTarotist}
                selectedMode={selectedTargetMode}
                onChangeMode={setSelectedTargetMode}
                onChangePlan={onChangePlan}
                isChangingPlan={isChangingPlan}
              />

              {/* ビュー2: カードスプレッド */}
              {selectedSpread && drawnCards.length > 0 && (
                <SpreadViewerSwipe
                  spread={selectedSpread}
                  drawnCards={drawnCards}
                  isRevealingComplete={isRevealingComplete}
                  setIsRevealingComplete={setIsRevealingComplete}
                />
              )}

              {/* ビュー3: カード詳細（プレースホルダー） */}
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100">
                <div className="text-center">
                  <div className="text-6xl mb-4">🃏</div>
                  <h2 className="text-2xl font-bold text-amber-900">
                    カード詳細ビュー
                  </h2>
                  <p className="text-gray-600 mt-2">個別カード表示エリア</p>
                </div>
              </div>
            </SwipeableContainer>
          </div>

          {/* 下半分 - 2つのビュー切り替え */}
          <div
            className="fixed left-0 right-0 overflow-auto"
            style={{
              top: "calc(45vh + 50px + env(safe-area-inset-top))",
              bottom: 0,
            }}
          >
            <SwipeableContainer
              activeIndex={lowerIndex}
              onIndexChange={setLowerIndex}
              showIndicators={true}
              showHint={true}
            >
              {/* ビュー1: サロンページ下半分（カテゴリ・スプレッド選択） */}
              <div className="w-full h-full">
                {/* ここに既存のCategorySpreadSelectorを配置 */}
                <div className="p-4">
                  <div className="text-center mb-4">
                    <span className="text-gray-800 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
                      占うジャンルとスプレッドを選んでください
                    </span>
                  </div>
                  {/* 実際にはCategorySpreadSelectorコンポーネントをここに */}
                </div>
              </div>

              {/* ビュー2: チャットパネル */}
              {selectedSpread && selectedCategory && selectedTarotist && (
                <ChatPanel onBack={() => setLowerIndex(0)} />
              )}
            </SwipeableContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default SwipeableDemo;
