import type {
  DrawnCard,
  MasterData,
  Plan,
  Spread,
  SpreadCell,
  TarotCard,
  Tarotist,
} from "../../../../shared/lib/types";
import { TEMP_CARDS } from "./cards";

export const canUseTarotist = (targetPlan: Plan, currentPlan: Plan) => {
  return targetPlan.no <= currentPlan.no;
};

export const getTarotistColor = (tarotist: Tarotist) => {
  const primary = tarotist.primaryColor;
  const secondary = tarotist.secondaryColor;
  const accent = tarotist.accentColor;

  return {
    primary,
    secondary,
    accent,
    bg: primary,
    button: accent,
  };
};

export const renderStars = (quality: number) => {
  return "⭐️".repeat(quality);
};

export const getPlanColors = (planCode: string, plans: Plan[]) => {
  const plan = plans.find((p: Plan) => p.code === planCode);
  if (
    !plan ||
    !plan.primaryColor ||
    !plan.secondaryColor ||
    !plan.accentColor
  ) {
    // フォールバック: デフォルトの色
    return {
      primary: "#F9FAFB",
      secondary: "#E5E7EB",
      accent: "#6B7280",
    };
  }

  return {
    primary: plan.primaryColor,
    secondary: plan.secondaryColor,
    accent: plan.accentColor,
  };
};

// カードをランダムに引く関数
export const drawRandomCards = (
  masterData: MasterData,
  selectedSpread: Spread
): DrawnCard[] => {
  // TODO: deck を言語指定できるようにする
  const allCards: TarotCard[] = masterData.decks?.[0]?.cards || TEMP_CARDS;
  const spreadCells: SpreadCell[] = selectedSpread.cells || [];
  const count = spreadCells.length;
  const shuffled = [...allCards].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  return spreadCells.map((cell, index) => {
    const card = selected[index];
    const isReversed = Math.random() > 0.5;

    return {
      id: `${card.id}-${index}`, // 仮にユニークIDを生成
      x: cell.x,
      y: cell.y,
      order: cell.order || index,
      position: cell.position || `位置${index + 1}`,
      description:
        cell.description ||
        `このカードの位置は${
          cell.position || `位置${index + 1}`
        }を示しています`,
      isHorizontal: cell.isHorizontal,
      isReversed,
      card,
      keywords: !isReversed ? card.uprightKeywords : card.reversedKeywords,
      cardId: card.id,
      createdAt: new Date(), // 仮の作成日時
    };
  });
};

export const getCardImagePath = (
  card: TarotCard,
  isBack: boolean = false
): string => {
  if (isBack) {
    return "/cards/back.png";
  }
  return `/cards/${card.code}.png`;
};
