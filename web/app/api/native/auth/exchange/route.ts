import { authService } from "@/lib/services/auth";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  console.log("📍 /api/native/auth/exchange - チケット交換リクエスト受信");

  try {
    const { ticket, deviceId } = await request.json().catch(() => ({}));

    if (!ticket || !deviceId) {
      console.error("❌ ticket または deviceId が不足");
      return new Response("invalid request", { status: 400 });
    }

    console.log(`🔄 チケット交換処理開始 (deviceId: ${deviceId})`);

    // AuthService経由でチケット交換・ユーザー紐付け（既存パターンに合わせて）
    const result = await authService.exchangeTicket({
      ticket,
      deviceId,
    });

    console.log(`✅ チケット交換完了 (clientId: ${result})`);

    // 既存パターンに合わせたレスポンス
    return Response.json({
      token: result.token,
    });
  } catch (error) {
    console.error("❌ チケット交換エラー:", error);

    const errorMessage =
      error instanceof Error ? error.message : "exchange failed";

    // 既存パターンに合わせたエラーハンドリング
    if (
      errorMessage.includes("Invalid ticket") ||
      errorMessage.includes("not found") ||
      errorMessage.includes("expired")
    ) {
      return new Response("invalid", { status: 401 });
    }

    return new Response("exchange failed", { status: 500 });
  }
}
