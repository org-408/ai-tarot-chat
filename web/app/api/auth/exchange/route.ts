import { logWithContext } from "@/lib/logger/logger";
import { authService } from "@/lib/services/auth";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  logWithContext("info", "📍 /api/auth/exchange - チケット交換リクエスト受信", { path: "/api/auth/exchange" });

  try {
    const { ticket, deviceId } = await request.json().catch(() => ({}));

    if (!ticket || !deviceId) {
      logWithContext("error", "❌ ticket または deviceId が不足", { ticket, deviceId });
      return new Response("invalid request", { status: 400 });
    }

    logWithContext("info", `🔄 チケット交換処理開始`, { ticket });

    // AuthService経由でチケット交換・ユーザー紐付け（既存パターンに合わせて）
    const token = await authService.exchangeTicket({
      ticket,
      deviceId,
    });

    logWithContext("info", `✅ チケット交換完了`, { token });

    // 既存パターンに合わせたレスポンス
    return Response.json({
      token,
    });
  } catch (error) {
    logWithContext("error", "❌ チケット交換エラー", { error });

    const errorMessage =
      error instanceof Error ? error.message : "exchange failed";

    // 既存パターンに合わせたエラーハンドリング
    if (
      errorMessage.includes("Invalid ticket") ||
      errorMessage.includes("not found") ||
      errorMessage.includes("expired")
    ) {
      logWithContext("warn", "❌ チケット交換リクエストが無効", { errorMessage, status: 401 });
      return new Response("invalid", { status: 401 });
    }

    logWithContext("error", "❌ チケット交換リクエストで予期せぬエラー", { errorMessage, status: 500 });
    return new Response("exchange failed", { status: 500 });
  }
}
