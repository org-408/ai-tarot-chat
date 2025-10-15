import { logWithContext } from "@/lib/logger/logger";
import { authService } from "@/lib/services/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  logWithContext("info", "📍 /api/auth/signout - サインアウトリクエスト受信", {
    path: "/api/auth/signout",
  });

  try {
    logWithContext("info", "🔄 サインアウト開始");

    // AuthService経由でサインアウト処理
    const token = await authService.signOut(request);
    logWithContext("info", `✅ サインアウト完了`, { token });

    return NextResponse.json({ token });
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
