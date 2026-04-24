/**
 * Phase 2.1 — MasterData の各レコードに `i18n.en` フィールドを付与する decorator。
 *
 * 将来 DB 側にカラムを追加する際 (follow-up issue) は、この decorator を
 * 差し替えるだけで移行できる。クライアント側は `record.i18n?.en` を
 * 参照するだけなので、データソースが変わっても影響しない。
 */

import type {
  MasterData,
  Plan,
  ReadingCategory,
  Spread,
  SpreadCell,
  SpreadLevel,
  Tarotist,
} from "@/../shared/lib/types";
import { getCategoryEn } from "./translations/categories-en";
import { getPlanEn } from "./translations/plans-en";
import {
  generateCellDescriptionEn,
  getCellPositionEn,
} from "./translations/spread-cells-en";
import { getSpreadLevelEn } from "./translations/spread-levels-en";
import { getSpreadEn } from "./translations/spreads-en";
import { getTarotistEn } from "./translations/tarotists-en";

function decoratePlan(plan: Plan): Plan {
  const en = getPlanEn(plan.code);
  if (!en) return plan;
  return { ...plan, i18n: { en } };
}

function decorateCategory(category: ReadingCategory): ReadingCategory {
  const en = getCategoryEn(category.no);
  if (!en) return category;
  return { ...category, i18n: { en } };
}

function decorateSpreadLevel(level: SpreadLevel): SpreadLevel {
  const en = getSpreadLevelEn(level.code);
  if (!en) return level;
  return { ...level, i18n: { en } };
}

function decorateSpreadCell(cell: SpreadCell): SpreadCell {
  const positionEn = getCellPositionEn(cell.position);
  if (!positionEn) return cell;
  return {
    ...cell,
    i18n: {
      en: {
        position: positionEn,
        description: generateCellDescriptionEn(cell.position),
      },
    },
  };
}

function decorateSpread(spread: Spread): Spread {
  const en = getSpreadEn(spread.code);
  const decoratedCells = spread.cells?.map(decorateSpreadCell);
  return {
    ...spread,
    ...(en ? { i18n: { en } } : {}),
    ...(decoratedCells ? { cells: decoratedCells } : {}),
  };
}

function decorateTarotist(tarotist: Tarotist): Tarotist {
  const en = getTarotistEn(tarotist.name);
  if (!en) return tarotist;
  return { ...tarotist, i18n: { en } };
}

/**
 * MasterData 全体に en 翻訳を適用する。JA データは元のまま残し、
 * 各レコードに `i18n.en` を追加するのみ。
 */
export function applyEnTranslations(master: MasterData): MasterData {
  return {
    ...master,
    plans: (master.plans ?? []).map(decoratePlan),
    categories: (master.categories ?? []).map(decorateCategory),
    levels: (master.levels ?? []).map(decorateSpreadLevel),
    spreads: (master.spreads ?? []).map(decorateSpread),
    tarotists: (master.tarotists ?? []).map(decorateTarotist),
    // decks は段階 1a で language カラム経由の切替を既に実装済み
    decks: master.decks,
  };
}

/**
 * 単体レコード用のデコレータも個別に公開する (API 個別ルート用)。
 */
export const i18nDecorators = {
  plan: decoratePlan,
  category: decorateCategory,
  spreadLevel: decorateSpreadLevel,
  spread: decorateSpread,
  spreadCell: decorateSpreadCell,
  tarotist: decorateTarotist,
};
