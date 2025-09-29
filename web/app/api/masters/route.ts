import { authService } from "@/lib/services/auth";
import { getAllMasterData } from "@/lib/services/master";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const auth = await authService.verifyApiRequest(request);
    if ("error" in auth) return auth.error;

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
