import { logWithContext } from "@/lib/server/logger/logger";
import { authService } from "@/lib/server/services/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  logWithContext(
    "info",
    "📍 /api/device/register - デバイス登録リクエスト受信",
    { path: "/api/device/register" }
  );

  try {
    const { deviceId, platform, appVersion, osVersion, pushToken } =
      await request.json().catch(() => ({}));

    if (!deviceId) {
      logWithContext("error", "❌ deviceId が不足", {
        deviceId,
        status: 400,
      });
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }

    logWithContext("info", `🔄 デバイス登録処理開始`);
    logWithContext(
      "info",
      `🔄 デバイス登録処理開始 - プラットフォーム: ${platform}, アプリバージョン: ${appVersion}, OSバージョン: ${osVersion}`,
      { deviceId }
    );
    logWithContext(
      "info",
      `プッシュ通知トークン: ${pushToken ? "あり" : "なし"}`
    );

    // AuthService経由でデバイス登録・更新
    const token = await authService.registerOrUpdateDevice({
      deviceId,
      platform,
      appVersion,
      osVersion,
      pushToken,
    });

    logWithContext("info", `✅ デバイス登録完了`, { deviceId, token });

    return Response.json({
      token,
    });
  } catch (error) {
    logWithContext("error", "❌ デバイス登録エラー", { error });

    const errorMessage =
      error instanceof Error ? error.message : "registration failed";
    logWithContext("error", "❌ デバイス登録リクエストで予期せぬエラー", {
      errorMessage,
      status: 500,
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
