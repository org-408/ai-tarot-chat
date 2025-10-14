/**
 * プランコードからRevenueCatパッケージ識別子を取得
 * 例: "FREE" → "free_package"
 */
export function getPackageIdentifier(planCode: string): string {
  switch (planCode) {
    case "FREE":
      return "free_package";
    case "STANDARD":
      return "com.atelierflowlab.aitarotchat.standard.monthly";
    case "PREMIUM":
      return "com.atelierflowlab.aitarotchat.premium.monthly";
    default:
      return "guest_package";
  }
}
