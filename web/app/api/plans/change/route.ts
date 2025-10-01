import { authService } from "@/lib/services/auth";
import { planService } from "@/lib/services/plan";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("📍 /api/plans/change - プラン変更リクエスト受信");
  try {
    // AuthService経由でセッション検証
    const payload = await authService.verifyApiRequest(request);
    if (
      "error" in payload ||
      !payload ||
      !payload.payload.deviceId ||
      !payload.payload.clientId
    )
      return new Response("unauthorized", { status: 401 });
    console.log(`✅ セッション検証完了 (payload: ${payload})`);

    // リクエストボディ取得
    const { code } = await request.json();
    const clientId = payload.payload.clientId;
    if (!code) {
      console.error("❌ planCode が不足");
      return new Response("invalid request", { status: 400 });
    }
    console.log(
      `🔄 プラン変更処理開始 (clientId: ${clientId}, planCode: ${code})`
    );

    // プラン変更処理
    const needsUpdate = await planService.changePlan(clientId, code);

    // JWTペイロード更新
    if (!needsUpdate) {
      console.log("❌ プラン変更失敗", needsUpdate, clientId, code);
      return new Response("plan change failed", { status: 500 });
    }

    const newToken = await authService.refreshJwtPayload(payload.payload, code);
    console.log(`✅ プラン変更完了`, needsUpdate, newToken);
    return NextResponse.json({ success: !!needsUpdate, token: newToken });
  } catch (error) {
    console.error("更新チェックエラー:", error);
    return NextResponse.json(
      { error: "更新チェックに失敗しました" },
      { status: 500 }
    );
  }
}
