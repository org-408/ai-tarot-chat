import { authService } from "@/lib/services/auth";
import { getPlans } from "@/lib/services/master";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("📍 /api/plans - プラン一覧取得リクエスト受信");

    // sessionチェック
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload || !payload)
      return new Response("unauthorized", { status: 401 });

    console.log(`✅ セッション検証完了 (payload: ${payload})`);

    // マスターデータからプラン一覧取得
    const plans = await getPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error("プラン一覧取得エラー:", error);
    return NextResponse.json(
      { error: "プラン一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
