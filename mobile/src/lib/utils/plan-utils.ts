/**
 * プランコードからRevenueCatパッケージ識別子を取得
 * 例: "FREE" → "free_package"
 */
export function getPackageIdentifier(planCode: string): string {
  switch (planCode) {
    case "FREE":
      return "free_package";
    case "STANDARD":
      return "$rc_monthly";
    case "PREMIUM":
      return "premium_monthly";
    default:
      return "guest_package";
  }
}

/**
 * プランコードからRevenueCatエンタイトルメント識別子を取得
 * 例: "STANDARD" → "standard"
 */
export function getEntitlementIdentifier(planCode: string): string {
  switch (planCode) {
    case "STANDARD":
      return "standard";
    case "PREMIUM":
      return "premium";
    default:
      return "";
  }
}
