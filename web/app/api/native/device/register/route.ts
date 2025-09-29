import { authService } from "@/lib/services/auth";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  console.log("📍 /api/native/device/register - デバイス登録リクエスト受信");

  try {
    const { deviceId, platform, appVersion, osVersion, pushToken } =
      await request.json().catch(() => ({}));

    if (!deviceId) {
      console.error("❌ deviceId が不足");
      return new Response("deviceId required", { status: 400 });
    }

    console.log(`🔄 デバイス登録処理開始 (deviceId: ${deviceId})`);

    // AuthService経由でデバイス登録・更新
    const result = await authService.registerOrUpdateDevice({
      deviceId,
      platform,
      appVersion,
      osVersion,
      pushToken,
    });

    console.log(`✅ デバイス登録完了 (clientId: ${result.client.id})`);

    // 既存パターンに合わせたレスポンス
    return Response.json({
      token: result.token,
      userId: result.client.userId,
      client: {
        id: result.client.id,
        userId: result.client.userId,
        isRegistered: result.client.isRegistered,
        plan: result.client.plan,
        user: result.client.user,
        dailyReadingsCount: result.client.dailyReadingsCount,
        lastReadingDate: result.client.lastReadingDate,
        dailyCelticsCount: result.client.dailyCelticsCount,
        lastCelticReadingDate: result.client.lastCelticReadingDate,
        dailyPersonalCount: result.client.dailyPersonalCount,
        lastPersonalReadingDate: result.client.lastPersonalReadingDate,
      },
    });
  } catch (error) {
    console.error("❌ デバイス登録エラー:", error);

    const errorMessage =
      error instanceof Error ? error.message : "registration failed";
    return new Response(errorMessage, { status: 500 });
  }
}
