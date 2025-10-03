import { authService } from "@/lib/services/auth";
import { checkMasterDataUpdates } from "@/lib/services/master";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("📍 /api/masters/check-updates - マスターデータ更新チェックリクエスト受信");
  try {
    // AuthService経由でセッション検証
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload || !payload)
      return new Response("unauthorized", { status: 401 });

    // リクエストボディ取得
    const { lastUpdatedAt } = await request.json();

    // 更新チェック
    const needsUpdate = await checkMasterDataUpdates(lastUpdatedAt);

    return NextResponse.json({ needsUpdate });
  } catch (error) {
    console.error("更新チェックエラー:", error);
    return NextResponse.json(
      { error: "更新チェックに失敗しました" },
      { status: 500 }
    );
  }
}
