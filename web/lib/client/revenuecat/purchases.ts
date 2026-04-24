"use client";

import { Purchases, PurchasesError, ErrorCode } from "@revenuecat/purchases-js";

// Module-level singleton: configure() は一度だけ、user が変わったら re-configure
let configuredUserId: string | null = null;

export function configureRC(appUserId: string): void {
  if (typeof window === "undefined") return;
  if (configuredUserId === appUserId) return;

  Purchases.configure({
    apiKey: process.env.NEXT_PUBLIC_REVENUECAT_WEB_KEY!,
    appUserId,
  });
  configuredUserId = appUserId;
}

// mobile の getPackageIdentifier() と同じ識別子を使用
function packageIdentifier(planCode: "STANDARD" | "PREMIUM"): string {
  return planCode === "PREMIUM" ? "premium_monthly" : "$rc_monthly";
}

export async function purchasePlan(planCode: "STANDARD" | "PREMIUM") {
  const offerings = await Purchases.getSharedInstance().getOfferings();
  const current = offerings.current;
  if (!current) throw new Error("RC offerings unavailable");

  const targetId = packageIdentifier(planCode);
  const pkg = current.availablePackages.find((p) => p.identifier === targetId);
  if (!pkg) throw new Error(`RC package not found: ${targetId}`);

  return Purchases.getSharedInstance().purchase({ rcPackage: pkg });
}

/**
 * 各プランのロケール通貨フォーマット済み価格を取得する。
 * 例: `{ STANDARD: "¥480", PREMIUM: "$9.99" }`
 *
 * RC Dashboard の Web Billing Product 多通貨設定に基づき、訪問者のロケール/国に
 * 応じた通貨表記が返る。取得失敗時は空 Map を返し、呼び出し側は DB price に
 * フォールバックする想定。
 */
export async function getFormattedPrices(): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (typeof window === "undefined") return result;

  try {
    const offerings = await Purchases.getSharedInstance().getOfferings();
    const current = offerings.current;
    if (!current) return result;

    for (const planCode of ["STANDARD", "PREMIUM"] as const) {
      const targetId = packageIdentifier(planCode);
      const pkg = current.availablePackages.find((p) => p.identifier === targetId);
      const formatted = pkg?.webBillingProduct.currentPrice.formattedPrice;
      if (formatted) result.set(planCode, formatted);
    }
  } catch {
    // ネットワーク/未 configure 等は呼び出し側フォールバックで吸収
  }
  return result;
}

export async function getCustomerInfo() {
  return Purchases.getSharedInstance().getCustomerInfo();
}

export async function getManagementURL(): Promise<string | null> {
  const info = await getCustomerInfo();

  // Web Billing (rc_billing) のサブスクリプションURLを優先。
  // root の managementURL は課金元 store 次第で App Store / Play Store を返すため、
  // Web 管理ポータル（pay.rev.cat/...）を確実に開くには per-subscription URL を使う。
  const webBillingURL = Object.values(info.subscriptionsByProductIdentifier)
    .find((s) => s.store === "rc_billing" && s.managementURL)
    ?.managementURL;

  return webBillingURL ?? info.managementURL ?? null;
}

// アクティブなサブスクリプションのストア種別を返す。
// "app_store" | "play_store" | "rc_billing" | その他 | null（未加入）
export async function getActiveSubscriptionStore(): Promise<string | null> {
  const info = await getCustomerInfo();
  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subs = Object.values(info.subscriptionsByProductIdentifier) as any[];
  const active = subs.find(
    (s) => s.expiresDate == null || new Date(s.expiresDate) > now,
  );
  return active?.store ?? null;
}

// mobile の getEntitlementIdentifier() と対称
export function planCodeFromEntitlements(
  active: Record<string, unknown>
): "STANDARD" | "PREMIUM" | null {
  if ("premium" in active) return "PREMIUM";
  if ("standard" in active) return "STANDARD";
  return null;
}

export { PurchasesError, ErrorCode };
