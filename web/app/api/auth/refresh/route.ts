import { logWithContext } from "@/lib/server/logger/logger";
import { authService } from "@/lib/server/services/auth";
import { NextRequest, NextResponse } from "next/server";

// NOTE: mobile/web 共通

export async function POST(request: NextRequest) {
  logWithContext(
    "info",
    "📍 /api/auth/refresh - セッション取得リクエスト受信",
    { path: "/api/auth/refresh" }
  );

  try {
    logWithContext("info", "🔄 セッション検証処理開始");

    // AuthService経由でセッション検証
    const token = await authService.detectTokenExpirationAndRefresh(request);
    logWithContext("info", `✅ セッション検証完了`, { token });

    return authService.respondWithTokenAndCookie(token);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "session validation failed";

    logWithContext("error", "❌ セッション検証エラー", { errorMessage });

    // 既存パターンに合わせたエラーハンドリング
    if (
      errorMessage.includes("Invalid") ||
      errorMessage.includes("not found") ||
      errorMessage.includes("expired")
    ) {
      logWithContext("warn", "❌ セッション検証リクエストが無効", {
        errorMessage,
        status: 401,
      });
      return NextResponse.json(`token invalid: ${errorMessage}`, {
        status: 401,
      });
    }

    logWithContext("error", "❌ セッション検証リクエストで予期せぬエラー", {
      errorMessage,
      status: 500,
    });
    return NextResponse.json(
      { error: `session validation failed :${errorMessage}` },
      {
        status: 500,
      }
    );
  }
}
