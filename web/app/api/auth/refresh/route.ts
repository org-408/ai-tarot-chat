import { logWithContext } from "@/lib/logger/logger";
import { authService } from "@/lib/services/auth";
import { NextRequest, NextResponse } from "next/server";

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

    return NextResponse.json({ token });
  } catch (error) {
    logWithContext("error", "❌ セッション検証エラー", { error });

    const errorMessage =
      error instanceof Error ? error.message : "session validation failed";

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
      return NextResponse.json("invalid", { status: 401 });
    }

    logWithContext("error", "❌ セッション検証リクエストで予期せぬエラー", {
      errorMessage,
      status: 500,
    });
    return NextResponse.json(`session validation failed :${errorMessage}`, {
      status: 500,
    });
  }
}
