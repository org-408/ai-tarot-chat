/**
 * プラン表示名の i18n ヘルパー（Web 版）。
 *
 * master data (DB) から来る `plan.name` は日本語固定 ("無料" 等) なので、
 * 英語 UI で表示するために plan.code (不変英大文字: GUEST/FREE/STANDARD/PREMIUM)
 * から i18n キーを引いて表示名を得る。
 *
 * モバイル側 `mobile/src/lib/utils/plan-display.ts` と同じ設計。
 */

type PlansTranslator = (key: string) => string;

/** 短いバッジ用ラベル (例: "無料" / "Free") */
export function getPlanBadgeLabel(
  planCode: string | null | undefined,
  tPlans: PlansTranslator,
  fallbackName?: string,
): string {
  switch (planCode) {
    case "GUEST":
      return tPlans("badgeGuest");
    case "FREE":
      return tPlans("badgeFree");
    case "STANDARD":
      return tPlans("badgeStandard");
    case "PREMIUM":
      return tPlans("badgePremium");
    default:
      return fallbackName ?? "";
  }
}

/** フル表示用ラベル (例: "無料プラン" / "Free plan") */
export function getPlanDisplayName(
  planCode: string | null | undefined,
  tPlans: PlansTranslator,
  fallbackName?: string,
): string {
  switch (planCode) {
    case "GUEST":
      return tPlans("displayGuest");
    case "FREE":
      return tPlans("displayFree");
    case "STANDARD":
      return tPlans("displayStandard");
    case "PREMIUM":
      return tPlans("displayPremium");
    default:
      return fallbackName ?? "";
  }
}
