import type { TFunction } from "i18next";

/**
 * プラン表示名の i18n ヘルパー。
 *
 * master data (DB) から来る `plan.name` は日本語固定 ("無料プラン" 等) なので、
 * 英語 UI で表示するために plan.code (不変英大文字: GUEST/FREE/STANDARD/PREMIUM)
 * から i18n キーを引いて表示名を得る。
 *
 * DB を改造せずクライアント側だけで多言語対応するための共通ヘルパー。
 */

/** 短いバッジ用ラベル (例: "無料" / "Free") */
export function getPlanBadgeLabel(
  planCode: string | null | undefined,
  t: TFunction,
  fallbackName?: string,
): string {
  switch (planCode) {
    case "GUEST":
      return t("plans.badgeGuest");
    case "FREE":
      return t("plans.badgeFree");
    case "STANDARD":
      return t("plans.badgeStandard");
    case "PREMIUM":
      return t("plans.badgePremium");
    default:
      return fallbackName ?? t("plans.badgeUnset");
  }
}

/** フル表示用ラベル (例: "無料プラン" / "Free Plan") */
export function getPlanDisplayName(
  planCode: string | null | undefined,
  t: TFunction,
  fallbackName?: string,
): string {
  switch (planCode) {
    case "GUEST":
      return t("plans.displayGuest");
    case "FREE":
      return t("plans.displayFree");
    case "STANDARD":
      return t("plans.displayStandard");
    case "PREMIUM":
      return t("plans.displayPremium");
    default:
      return fallbackName ?? t("plans.displayUnset");
  }
}
