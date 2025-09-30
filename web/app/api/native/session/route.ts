import { authService } from "@/lib/services/auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  console.log("📍 /api/native/session - セッション取得リクエスト受信");

  try {
    console.log("🔄 セッション検証処理開始");

    // AuthService経由でセッション検証
    const client = await authService.verifyApiRequest(request);
    if ("error" in client || !client)
      return new Response("unauthorized", { status: 401 });

    console.log(`✅ セッション検証完了 (client: ${client})`);

    // 既存パターンに合わせたレスポンス
    return Response.json({
      client,
    });
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
