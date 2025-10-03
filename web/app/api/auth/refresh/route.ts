import { authService } from "@/lib/services/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("📍 /api/auth/refresh - セッション取得リクエスト受信");

  try {
    console.log("🔄 セッション検証処理開始");

    // AuthService経由でセッション検証
    const token = await authService.detectTokenExpirationAndRefresh(request);
    console.log(`✅ セッション検証完了 (payload: ${token})`);

    return NextResponse.json({ token });
  } catch (error) {
    console.error("❌ セッション検証エラー:", error);

    const errorMessage =
      error instanceof Error ? error.message : "session validation failed";

    // 既存パターンに合わせたエラーハンドリング
    if (
      errorMessage.includes("Invalid") ||
      errorMessage.includes("not found")
    ) {
      return new Response("invalid", { status: 401 });
    }

    return new Response("session validation failed", { status: 500 });
  }
}
