import { logWithContext } from "@/lib/server/logger/logger";
import { authService } from "@/lib/server/services/auth";
import { masterService } from "@/lib/server/services/master";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  logWithContext(
    "info",
    "📍 /api/masters/check-updates - マスターデータ更新チェックリクエスト受信",
    { path: "/api/masters/check-updates" }
  );
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

    // リクエストボディ取得
    const { version } = await request.json();

    // 更新チェック
    logWithContext(
      "info",
      "📍 /api/masters/check-updates - マスターデータ更新チェック開始",
      { clientVersion: version }
    );

    const result = await masterService.checkMasterDataUpdates(version);

    logWithContext("info", "✅ マスターデータ更新チェック完了", { result });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logWithContext("error", "❌ 更新チェックエラー", {
      error,
      status: 500,
    });
    return NextResponse.json(
      { error: "更新チェックに失敗しました" },
      { status: 500 }
    );
  }
}
