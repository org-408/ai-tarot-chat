import { authService } from "@/lib/services/auth";
import { getAllMasterData } from "@/lib/services/master";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("📍 /api/masters/ - マスタデータ取得リクエスト受信");
  try {
    // AuthService経由でセッション検証
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload || !payload)
      return new Response("unauthorized", { status: 401 });

    // マスターデータ取得
    const masters = await getAllMasterData();

    return NextResponse.json(masters);
  } catch (error) {
    console.error("マスタデータ取得エラー:", error);
    return NextResponse.json(
      { error: "マスタデータの取得に失敗しました" },
      { status: 500 }
    );
  }
}
