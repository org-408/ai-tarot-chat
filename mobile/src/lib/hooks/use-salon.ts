import { useSalonStore } from "../stores/salon";

/**
 * Salon（サロン）情報のフック
 *
 */
export function useSalon() {
  const {
    selectedTarotist,
    selectedPersonalTarotist,
    quickCategory,
    personalCategory,
    customQuestion,
    quickSpread,
    personalSpread,
    lastClaraCategoryId,
    lastClaraSpreadId,
    drawnCards,
    isRevealingCompleted,
    selectedTargetMode,
    selectedPersonalTargetMode,
    spreadViewerMode,
    upperViewerMode,
    lowerViewerMode,
    isPersonal,
    messages,
    init,
    setSelectedTarotist,
    setSelectedPersonalTarotist,
    setQuickCategory,
    setPersonalCategory,
    setCustomQuestion,
    setQuickSpread,
    setPersonalSpread,
    setLastClaraSelection,
    setDrawnCards,
    setIsRevealingCompleted,
    setSelectedTargetMode,
    setSelectedPersonalTargetMode,
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
    selectedPersonalTarotist,
    quickCategory,
    personalCategory,
    customQuestion,
    quickSpread,
    personalSpread,
    lastClaraCategoryId,
    lastClaraSpreadId,
    drawnCards,
    isRevealingCompleted,
    selectedTargetMode,
    selectedPersonalTargetMode,
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
    setQuickCategory,
    setPersonalCategory,
    setCustomQuestion,
    setQuickSpread,
    setPersonalSpread,
    setLastClaraSelection,
    setDrawnCards,
    setIsRevealingCompleted,
    setSelectedTargetMode,
    setSelectedPersonalTargetMode,
    setSpreadViewerMode,
    setUpperViewerMode,
    setLowerViewerMode,
    setIsPersonal,
    setMessages,
  };
}
