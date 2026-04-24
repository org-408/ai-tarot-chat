import type { TFunction } from "i18next";

/**
 * プランの表示価格を解決する。
 *
 * 優先順:
 *   1. `plan.price === 0` → `t("plans.free")` (ローカライズされた "無料"/"Free")
 *   2. RC から取得したロケール通貨フォーマット済み価格 (例: `"¥480"` / `"$9.99"`)
 *   3. フォールバック: `¥{price}` (RC 未初期化・Web プラットフォーム時など)
 *
 * 注: フォールバックの `¥` は RC が使えない開発環境での表示でしかなく、
 * リリースビルドでは常に 1 or 2 に解決される想定。
 */
export function formatPlanPrice(
  planCode: string,
  planPrice: number,
  formattedPrices: Map<string, string>,
  t: TFunction,
): string {
  if (planPrice === 0) return t("plans.free");
  const rcPrice = formattedPrices.get(planCode);
  if (rcPrice) return rcPrice;
  return `¥${planPrice.toLocaleString()}`;
}
