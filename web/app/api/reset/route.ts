import { logWithContext } from "@/lib/server/logger/logger";
import { resetService } from "@/lib/server/services/reset";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const secret = body.secret;

  // 環境変数からシークレット取得
  const expectedSecret = process.env.AUTH_SECRET;

  if (!secret || secret !== expectedSecret) {
    logWithContext("warn", "Unauthorized reset attempt", {
      path: "/api/reset",
      secret,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await resetService.resetDatabase();
    return NextResponse.json({ success: true });
  } catch (error) {
    logWithContext("error", "Error resetting database", {
      error,
      path: "/api/reset",
    });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
