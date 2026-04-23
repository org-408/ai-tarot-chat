export const CARD_ASPECT = 70 / 120; // 業界標準 70mm × 120mm

/**
 * カード表示の最大高さ (CSS px)。
 * 業界標準タロットカード 120mm ≒ 4.72in ≒ 453px (96 CSS dpi 基準) を切り上げ。
 * CarouselView / GridView いずれも上限として使用し、
 * 大画面（Web 大ウィンドウ・iPad 等）で非現実的なサイズになるのを防ぐ。
 */
export const MAX_CARD_HEIGHT = 456;
