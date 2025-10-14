/**
 * プランコードからRevenueCatパッケージ識別子を取得
 * 例: "FREE" → "free_package"
 */
export function getPackageIdentifier(planCode: string): string {
  switch (planCode) {
    case "FREE":
      return "free_package";
    case "STANDARD":
      return "standard_package";
    case "PREMIUM":
      return "premium_package";
    default:
      return "guest_package";
  }
}
