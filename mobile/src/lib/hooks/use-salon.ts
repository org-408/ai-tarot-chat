import { useSalonStore } from "../stores/salon";

/**
 * Salon（サロン）情報のフック
 *
 */
export function useSalon() {
  const {
    selectedTarotist,
    selectedCategory,
    customQuestion,
    selectedSpread,
    drawnCards,
    isRevealingCompleted,
    selectedTargetMode,
    spreadViewerMode,
    upperViewerMode,
    lowerViewerMode,
    isPersonal,
    messages,
    init,
    setSelectedTarotist,
    setSelectedCategory,
    setCustomQuestion,
    setSelectedSpread,
    setDrawnCards,
    setIsRevealingCompleted,
    setSelectedTargetMode,
    setSpreadViewerMode,
    setUpperViewerMode,
    setLowerViewerMode,
    setIsPersonal,
    setMessages,
  } = useSalonStore();

  return {
    // ============================================
    // 占う対象の選択状況（Salon Store から取得）
    // ============================================
    selectedTarotist,
    selectedCategory,
    customQuestion,
    selectedSpread,
    drawnCards,
    isRevealingCompleted,
    selectedTargetMode,
    spreadViewerMode,
    upperViewerMode,
    lowerViewerMode,
    isPersonal,
    messages,

    // ============================================
    // アクション
    // ============================================
    init,
    setSelectedTarotist,
    setSelectedCategory,
    setCustomQuestion,
    setSelectedSpread,
    setDrawnCards,
    setIsRevealingCompleted,
    setSelectedTargetMode,
    setSpreadViewerMode,
    setUpperViewerMode,
    setLowerViewerMode,
    setIsPersonal,
    setMessages,
  };
}
