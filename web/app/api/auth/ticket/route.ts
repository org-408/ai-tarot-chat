import { logWithContext } from "@/lib/logger/logger";
import { authService } from "@/lib/services/auth";

export async function GET() {
  await logWithContext(
    "info",
    "📍 /api/auth/ticket - チケット発行リクエスト受信",
    { path: "/api/auth/ticket" }
  );

  try {
    // AuthService経由でチケット生成
    const ticket = await authService.generateTicket();
    if (!ticket) {
      await logWithContext("error", "❌ チケットが取得できませんでした");
      throw new Error("チケットが取得できませんでした");
    }
    await logWithContext("info", "✅ チケット発行成功", { token: ticket });

    return Response.json({ ticket });
  } catch (error) {
    await logWithContext("error", "❌ チケット発行エラー", { error });

    const errorMessage =
      error instanceof Error ? error.message : "ticket generation failed";
    const statusCode = errorMessage.includes("Not authenticated") ? 401 : 500;

    await logWithContext("error", "❌ チケット発行リクエストで予期せぬエラー", {
      errorMessage,
      status: statusCode,
    });
    return new Response(errorMessage, { status: statusCode });
  }
}
