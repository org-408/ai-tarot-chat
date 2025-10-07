import { logWithContext } from "@/lib/logger/logger";
import { authService } from "@/lib/services/auth";
import { planService } from "@/lib/services/plan";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  await logWithContext("info", "📍 /api/plans/change - プラン変更リクエスト受信", { path: "/api/plans/change" });
  try {
    // AuthService経由でセッション検証
    const payload = await authService.verifyApiRequest(request);
    if (
      "error" in payload ||
      !payload ||
      !payload.payload.deviceId ||
      !payload.payload.clientId
    ) {
      await logWithContext("error", "❌ セッション検証エラー", { payload, status: 401 });
      return new Response("unauthorized", { status: 401 });
    }
    await logWithContext("info", `✅ セッション検証完了`, { payload });

    // リクエストボディ取得
    const { code } = await request.json();
    const clientId = payload.payload.clientId;
    if (!code) {
      await logWithContext("error", "❌ planCode が不足", { code, status: 400 });
      return new Response("invalid request", { status: 400 });
    }
    await logWithContext("info", `🔄 プラン変更処理開始`, { clientId, code });

    // プラン変更処理
    const needsUpdate = await planService.changePlan(clientId, code);

    // JWTペイロード更新
    if (!needsUpdate) {
      await logWithContext("error", "❌ プラン変更失敗", { needsUpdate, clientId, code, status: 500 });
      return new Response("plan change failed", { status: 500 });
    }

    const newToken = await authService.refreshJwtPayload(payload.payload, code);
    await logWithContext("info", `✅ プラン変更完了`, { needsUpdate, newToken });
    return NextResponse.json({ success: !!needsUpdate, token: newToken });
  } catch (error) {
    await logWithContext("error", "❌ 更新チェックエラー", { error, status: 500 });
    return NextResponse.json(
      { error: "更新チェックに失敗しました" },
      { status: 500 }
    );
  }
}
