import { notificationService } from "@/lib/server/services/notification";
import { NextRequest, NextResponse } from "next/server";
const ADMIN_SECRET = process.env.ADMIN_API_SECRET;

export async function POST(req: NextRequest) {
  // 管理者シークレットで認証
  const authHeader = req.headers.get("authorization");
  if (!ADMIN_SECRET || authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const platform: string = body?.platform ?? "both"; // 絞り込み用（省略時は全員）
  const dryRun: boolean = body?.dryRun ?? false;

  const subscribers = await notificationService.listPendingSubscribers(
    platform as "all" | "ios" | "android" | "both"
  );

  if (subscribers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "送信対象者がいません" });
  }

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, count: subscribers.length, emails: subscribers.map((s) => s.email) });
  }

  const { sent, errors } = await notificationService.sendReleaseNotifications(
    platform as "all" | "ios" | "android" | "both"
  );

  return NextResponse.json({ ok: true, sent, errors: errors.length > 0 ? errors : undefined });
}
