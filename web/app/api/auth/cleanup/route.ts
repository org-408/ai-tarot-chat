import { logWithContext } from "@/lib/server/logger/logger";
import { authService } from "@/lib/server/services/auth";
import { NextResponse } from "next/server";

// クリーンアップAPI (1時間に1回)
export async function GET(request: Request) {
  logWithContext(
    "info",
    "📍 /api/auth/cleanup - 期限切れチケットのクリーンアップ開始",
    { request, path: "/apit/auth/cleanup" }
  );
  const count = await authService.cleanupExpiredTickets();
  return NextResponse.json({ deletedCount: count });
}
