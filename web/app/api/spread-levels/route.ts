import { getSpreadLevels } from "@/lib/services/master-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const levels = await getSpreadLevels();
    return NextResponse.json(levels);
  } catch (error) {
    console.error("スプレッドレベル一覧取得エラー:", error);
    return NextResponse.json(
      { error: "スプレッドレベル一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
