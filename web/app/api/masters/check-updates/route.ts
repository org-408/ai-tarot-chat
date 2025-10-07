import { logWithContext } from "@/lib/logger/logger";
import { authService } from "@/lib/services/auth";
import { checkMasterDataUpdates } from "@/lib/services/master";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  await logWithContext(
    "info",
    "📍 /api/masters/check-updates - マスターデータ更新チェックリクエスト受信",
    { path: "/api/masters/check-updates" }
  );
  try {
    // AuthService経由でセッション検証
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload || !payload) {
      await logWithContext("error", "❌ セッション検証エラー", {
        payload,
        status: 401,
      });
      return new Response("unauthorized", { status: 401 });
    }

    // リクエストボディ取得
    const { lastUpdatedAt } = await request.json();

    // 更新チェック
    const needsUpdate = await checkMasterDataUpdates(lastUpdatedAt);
    await logWithContext(
      "info",
      "📍 /api/masters/check-updates - マスターデータ更新チェック完了",
      { needsUpdate }
    );

    return NextResponse.json({ needsUpdate });
  } catch (error) {
    await logWithContext("error", "❌ 更新チェックエラー", {
      error,
      status: 500,
    });
    return NextResponse.json(
      { error: "更新チェックに失敗しました" },
      { status: 500 }
    );
  }
}
