/**
 * ユーザーが RevenueCat の購入ダイアログをキャンセルしたときの例外。
 *
 * 仕様: docs/plan-change-navigation-spec.md / .claude/rules/plan-change-navigation.md
 *
 * キャンセルは「失敗」とは区別して扱う必要がある（キャンセル時の自動遷移はしない、
 * エラー通知も出さない）。lifecycle.ts の changePlan はキャンセルを握り潰さず
 * この例外を throw し、呼び出し側が `instanceof PurchaseCancelledError` で判別する。
 */
export class PurchaseCancelledError extends Error {
  constructor(message = "Purchase cancelled by user") {
    super(message);
    this.name = "PurchaseCancelledError";
  }
}
