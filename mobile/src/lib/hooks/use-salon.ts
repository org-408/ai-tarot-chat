import { useSalonStore } from "../stores/salon";

/**
 * Salon（サロン）情報のフック
 *
 */
export function useSalon() {
  const {
    selectedTarotist,
    selectedCategory,
    selectedSpread,
    drawnCards,
    isRevealingCompleted,
    selectedTargetMode,
    spreadViewerMode,
    upperViewerMode,
    lowerViewerMode,
    isPersonal,
    init,
    setSelectedTarotist,
    setSelectedCategory,
    setSelectedSpread,
    setDrawnCards,
    setIsRevealingCompleted,
    setSelectedTargetMode,
    setSpreadViewerMode,
    setUpperViewerMode,
    setLowerViewerMode,
    setIsPersonal,
  } = useSalonStore();

  return {
    // ============================================
    // 占う対象の選択状況（Salon Store から取得）
    // ============================================
    selectedTarotist,
    selectedCategory,
    selectedSpread,
    drawnCards,
    isRevealingCompleted,
    selectedTargetMode,
    spreadViewerMode,
    upperViewerMode,
    lowerViewerMode,
    isPersonal,

    // ============================================
    // アクション
    // ============================================
    init,
    setSelectedTarotist,
    setSelectedCategory,
    setSelectedSpread,
    setDrawnCards,
    setIsRevealingCompleted,
    setSelectedTargetMode,
    setSpreadViewerMode,
    setUpperViewerMode,
    setLowerViewerMode,
    setIsPersonal,
  };
}
