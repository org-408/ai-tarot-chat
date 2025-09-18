import { getAllMasterData } from "@/lib/services/master-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const masters = await getAllMasterData();
    return NextResponse.json(masters);
  } catch (error) {
    console.error("マスタデータ一括取得エラー:", error);
    return NextResponse.json(
      { error: "マスタデータの取得に失敗しました" },
      { status: 500 }
    );
  }
}
