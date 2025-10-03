import { authService } from "@/lib/services/auth";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  console.log("📍 /api/device/register - デバイス登録リクエスト受信");

  try {
    const { deviceId, platform, appVersion, osVersion, pushToken } =
      await request.json().catch(() => ({}));

    if (!deviceId) {
      console.error("❌ deviceId が不足");
      return new Response("deviceId required", { status: 400 });
    }

    console.log(`🔄 デバイス登録処理開始 (deviceId: ${deviceId})`);
    console.log(
      `プラットフォーム: ${platform}, アプリバージョン: ${appVersion}, OSバージョン: ${osVersion}`
    );
    console.log(`プッシュ通知トークン: ${pushToken ? "あり" : "なし"}`);

    // AuthService経由でデバイス登録・更新
    const token = await authService.registerOrUpdateDevice({
      deviceId,
      platform,
      appVersion,
      osVersion,
      pushToken,
    });

    console.log(`✅ デバイス登録完了 (token: ${token})`);

    return Response.json({
      token,
    });
  } catch (error) {
    console.error("❌ デバイス登録エラー:", error);

    const errorMessage =
      error instanceof Error ? error.message : "registration failed";
    return new Response(errorMessage, { status: 500 });
  }
}
