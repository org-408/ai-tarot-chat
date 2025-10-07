import { logWithContext } from "@/lib/logger/logger";
import { getSpreadLevels } from "@/lib/services/master";
import { NextResponse } from "next/server";

export async function GET() {
  logWithContext(
    "info",
    "📍 /api/spread-levels - スプレッドレベル一覧取得リクエスト受信",
    { path: "/api/spread-levels" }
  );
  try {
    const levels = await getSpreadLevels();
    logWithContext("info", "✅ スプレッドレベル一覧取得完了", { levels });
    return NextResponse.json(levels);
  } catch (error) {
    logWithContext("error", "❌ スプレッドレベル一覧取得エラー", {
      error,
      status: 500,
    });
    return NextResponse.json(
      { error: "スプレッドレベル一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
