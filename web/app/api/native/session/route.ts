import { authService } from "@/lib/services/auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  console.log("📍 /api/native/session - セッション取得リクエスト受信");

  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ Authorization ヘッダーが不足");
      return new Response("unauthorized", { status: 401 });
    }

    const token = authHeader.substring(7);

    console.log("🔄 セッション検証処理開始");

    // AuthService経由でセッション検証
    const client = await authService.validateSession(token);

    console.log(`✅ セッション検証完了 (clientId: ${client.id})`);

    // 既存パターンに合わせたレスポンス
    return Response.json({
      userId: client.userId,
      client: {
        id: client.id,
        userId: client.userId,
        isRegistered: client.isRegistered,
        planCode: client.plan?.code,
        plan: client.plan,
        user: client.user,
        dailyReadingsCount: client.dailyReadingsCount,
        lastReadingDate: client.lastReadingDate,
        dailyCelticsCount: client.dailyCelticsCount,
        lastCelticReadingDate: client.lastCelticReadingDate,
        dailyPersonalCount: client.dailyPersonalCount,
        lastPersonalReadingDate: client.lastPersonalReadingDate,
      },
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
