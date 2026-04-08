import { useSalonStore } from "../stores/salon";

/**
 * Salon（サロン）情報のフック
 *
 */
export function useSalon() {
  const {
    selectedTarotist,
    selectedPersonalTarotist,
    selectedCategory,
    customQuestion,
    selectedSpread,
    lastClaraCategoryId,
    lastClaraSpreadId,
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
    setSelectedPersonalTarotist,
    setSelectedCategory,
    setCustomQuestion,
    setSelectedSpread,
    setLastClaraSelection,
    setDrawnCards,
    setIsRevealingCompleted,
    setSelectedTargetMode,
    setSpreadViewerMode,
    setUpperViewerMode,
    setLowerViewerMode,
    setIsPersonal,
    setMessages,
  } = useSalonStore();

  // パーソナル占い時は selectedPersonalTarotist、クイック占い時は selectedTarotist を使う
  const activeTarotist = isPersonal ? selectedPersonalTarotist : selectedTarotist;

  return {
    // ============================================
    // 占う対象の選択状況（Salon Store から取得）
    // ============================================
    selectedTarotist,
    selectedPersonalTarotist,
    activeTarotist,
    selectedCategory,
    customQuestion,
    selectedSpread,
    lastClaraCategoryId,
    lastClaraSpreadId,
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
    setSelectedPersonalTarotist,
    setSelectedCategory,
    setCustomQuestion,
    setSelectedSpread,
    setLastClaraSelection,
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
