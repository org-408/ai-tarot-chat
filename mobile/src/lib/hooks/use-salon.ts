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
    selectedTargetMode,
    spreadViewerMode,
    setSelectedTarotist,
    setSelectedCategory,
    setSelectedSpread,
    setDrawnCards,
    setSelectedTargetMode,
    setSpreadViewerMode,
  } = useSalonStore();

  return {
    // ============================================
    // 占う対象の選択状況（Salon Store から取得）
    // ============================================
    selectedTarotist,
    selectedCategory,
    selectedSpread,
    drawnCards,
    selectedTargetMode,
    spreadViewerMode,

    // ============================================
    // アクション
    // ============================================
    setSelectedTarotist,
    setSelectedCategory,
    setSelectedSpread,
    setDrawnCards,
    setSelectedTargetMode,
    setSpreadViewerMode,
  };
}
