import { logWithContext } from "@/lib/logger/logger";
import { authService } from "@/lib/services/auth";
import { log } from "console";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  await logWithContext("info", "📍 /api/device/register - デバイス登録リクエスト受信", { path: "/api/device/register" });

  try {
    const { deviceId, platform, appVersion, osVersion, pushToken } =
      await request.json().catch(() => ({}));

    if (!deviceId) {
      await logWithContext("error", "❌ deviceId が不足", { deviceId, status: 400 });
      return new Response("deviceId required", { status: 400 });
    }

    await logWithContext("info", `🔄 デバイス登録処理開始`);
    await logWithContext("info",
      `🔄 デバイス登録処理開始 - プラットフォーム: ${platform}, アプリバージョン: ${appVersion}, OSバージョン: ${osVersion}`,
      { deviceId }
    );
    await logWithContext("info", `プッシュ通知トークン: ${pushToken ? "あり" : "なし"}`);

    // AuthService経由でデバイス登録・更新
    const token = await authService.registerOrUpdateDevice({
      deviceId,
      platform,
      appVersion,
      osVersion,
      pushToken,
    });

    await logWithContext("info", `✅ デバイス登録完了`, { deviceId, token });

    return Response.json({
      token,
    });
  } catch (error) {
    await logWithContext("error", "❌ デバイス登録エラー", { error });

    const errorMessage =
      error instanceof Error ? error.message : "registration failed";
    await logWithContext("error", "❌ デバイス登録リクエストで予期せぬエラー", { errorMessage, status: 500 });
    return new Response(errorMessage, { status: 500 });
  }
}
