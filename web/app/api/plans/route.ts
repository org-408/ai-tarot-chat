import { logWithContext } from "@/lib/logger/logger";
import { authService } from "@/lib/services/auth";
import { getPlans } from "@/lib/services/master";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    logWithContext("info", "📍 /api/plans - プラン一覧取得リクエスト受信", {
      path: "/api/plans",
    });

    // sessionチェック
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload || !payload) {
      logWithContext("error", "❌ セッション検証エラー", {
        payload,
        status: 401,
      });
      return new Response("unauthorized", { status: 401 });
    }

    logWithContext("info", `✅ セッション検証完了`, { payload });

    // マスターデータからプラン一覧取得
    const plans = await getPlans();
    logWithContext("info", "📍 /api/plans - プラン一覧取得完了", {
      plans,
    });
    return NextResponse.json(plans);
  } catch (error) {
    logWithContext("error", "❌ プラン一覧取得エラー", {
      error,
      status: 500,
    });
    return NextResponse.json(
      { error: "プラン一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
