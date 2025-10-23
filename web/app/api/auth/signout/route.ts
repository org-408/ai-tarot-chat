import { logWithContext } from "@/lib/server/logger/logger";
import { authService } from "@/lib/server/services/auth";
import { NextRequest, NextResponse } from "next/server";

// NOTE: mobile/web 共通

export async function POST(request: NextRequest) {
  logWithContext("info", "📍 /api/auth/signout - サインアウトリクエスト受信", {
    path: "/api/auth/signout",
  });

  try {
    logWithContext("info", "🔄 サインアウト開始");

    // AuthService経由でサインアウト処理
    const token = await authService.signOut(request);
    logWithContext("info", `✅ サインアウト完了`, { token });

    return authService.respondWithTokenAndClearedCookie(token);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "sign out failed";

    logWithContext("error", "❌ サインアウトエラー", {
      errorMessage,
      status: 500,
    });
    return NextResponse.json(
      { error: `sign out failed :${errorMessage}` },
      {
        status: 500,
      }
    );
  }
}
