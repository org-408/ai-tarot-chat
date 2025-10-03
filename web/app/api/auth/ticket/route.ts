import { authService } from "@/lib/services/auth";

export async function GET() {
  console.log("📍 /api/auth/ticket - チケット発行リクエスト受信");

  try {
    // AuthService経由でチケット生成
    const ticket = await authService.generateTicket();
    if (!ticket) {
      throw new Error("チケットが取得できませんでした");
    }
    console.log("✅ チケット発行成功: token", ticket);

    return Response.json({ ticket });
  } catch (error) {
    console.error("❌ チケット発行エラー:", error);

    const errorMessage =
      error instanceof Error ? error.message : "ticket generation failed";
    const statusCode = errorMessage.includes("Not authenticated") ? 401 : 500;

    return new Response(errorMessage, { status: statusCode });
  }
}
