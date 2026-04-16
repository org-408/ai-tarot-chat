import { clientService } from "@/lib/server/services";
import { logWithContext } from "@/lib/server/logger/logger";
import { NextRequest, NextResponse } from "next/server";

// RC が送ってくるイベント種別
const GRANT_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
]);
const REVOKE_EVENTS = new Set([
  "EXPIRATION",
  "BILLING_ISSUE",
]);
// CANCELLATION は期間末まで有効なので EXPIRATION で処理

// RC entitlement 識別子 → planCode（mobile の getEntitlementIdentifier() と対称）
function resolvePlanCode(
  entitlementIds: string[] | undefined
): "STANDARD" | "PREMIUM" | null {
  if (!entitlementIds) return null;
  if (entitlementIds.includes("premium")) return "PREMIUM";
  if (entitlementIds.includes("standard")) return "STANDARD";
  return null;
}

export async function POST(request: NextRequest) {
  // 静的ベアラートークンで認証（RC は HMAC ではなく固定トークン方式）
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.REVENUECAT_WEBHOOK_AUTH_HEADER ?? ""}`;
  if (!auth || auth !== expected) {
    logWithContext("warn", "RC webhook: unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let eventType = "unknown";
  let appUserId = "unknown";
  try {
    const body = await request.json();
    const event = body?.event;
    if (!event) {
      return NextResponse.json({ received: true });
    }

    eventType = event.type as string;
    appUserId = event.app_user_id as string;
    const entitlementIds = event.entitlement_ids as string[] | undefined;

    logWithContext("info", "RC webhook received", { eventType, appUserId, entitlementIds });

    // app_user_id = configure() に渡した userId = NextAuth User.id
    const client = await clientService.getClientByUserId(appUserId);
    if (!client) {
      // 新規 Web ユーザーが購入前に webhook が届くケース（稀）
      logWithContext("warn", "RC webhook: client not found", { appUserId });
      return NextResponse.json({ received: true });
    }

    if (GRANT_EVENTS.has(eventType)) {
      const planCode = resolvePlanCode(entitlementIds);
      if (planCode) {
        await clientService.changePlan(client.id, planCode);
        logWithContext("info", "RC webhook: plan granted", {
          clientId: client.id,
          planCode,
          eventType,
        });
      }
    } else if (REVOKE_EVENTS.has(eventType)) {
      await clientService.changePlan(client.id, "FREE");
      logWithContext("info", "RC webhook: plan revoked → FREE", {
        clientId: client.id,
        eventType,
      });
    } else {
      logWithContext("info", `RC webhook: unhandled event ${eventType}`);
    }
  } catch (error) {
    logWithContext("error", "RC webhook processing error", {
      error,
      eventType,
      appUserId,
    });
    // 500 を返すと RC がリトライするので、処理済みとして 200 を返す
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
