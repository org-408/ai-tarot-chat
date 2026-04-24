import { useEffect, useState } from "react";
import { subscriptionService } from "../services/subscription";
import { useSubscriptionStore } from "../stores/subscription";

/**
 * 各プランの RevenueCat 経由のロケール通貨フォーマット済み価格を返す。
 * Web プラットフォームや Offerings 取得失敗時は空 Map。呼び出し側は
 * `formattedPrices.get("STANDARD") ?? fallback` の形で DB price にフォールバックする。
 *
 * RC 初期化後に一度だけ取得する。
 */
export function usePlanPrices(): Map<string, string> {
  const { isInitialized } = useSubscriptionStore();
  const [prices, setPrices] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!isInitialized) return;
    let cancelled = false;
    subscriptionService.getFormattedPrices().then((map) => {
      if (!cancelled) setPrices(map);
    });
    return () => {
      cancelled = true;
    };
  }, [isInitialized]);

  return prices;
}
