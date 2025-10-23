import { logWithContext } from "@/lib/server/logger/logger";
import { authService } from "@/lib/server/services/auth";
import { masterService } from "@/lib/server/services/master";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  logWithContext("info", "📍 /api/masters/ - マスタデータ取得リクエスト受信", {
    path: "/api/masters",
  });
  try {
    // AuthService経由でセッション検証
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload || !payload) {
      logWithContext("error", "❌ セッション検証エラー", {
        payload,
        status: 401,
      });
      return new Response("unauthorized", { status: 401 });
    }

    // マスターデータ取得
    const masters = await masterService.getAllMasterData();
    logWithContext("info", "📍 /api/masters/ - マスタデータ取得完了");

    return NextResponse.json(masters);
  } catch (error) {
    logWithContext("error", "❌ マスタデータ取得エラー", {
      error,
      status: 500,
    });
    return NextResponse.json(
      { error: "マスタデータの取得に失敗しました" },
      { status: 500 }
    );
  }
}
