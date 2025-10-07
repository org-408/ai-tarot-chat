import { logWithContext } from "@/lib/logger/logger";
import { bulkUpdateSpreadCells } from "@/lib/services/spread";
import { NextRequest, NextResponse } from "next/server";

// 複数セル一括更新
export async function PUT(request: NextRequest) {
  logWithContext("info", "📍 /api/spread-cells/bulk - 複数セル一括更新リクエスト受信");
  try {
    const { cells } = await request.json();
    if (!Array.isArray(cells)) {
      logWithContext("error", "❌ 複数セル一括更新エラー: 正しいセルデータが提供されていません", { status: 400 });
      return NextResponse.json(
        { error: "正しいセルデータが提供されていません" },
        { status: 400 }
      );
    }
    await bulkUpdateSpreadCells(cells);
    logWithContext("info", "✅ 複数セル一括更新完了", { cells });
    return NextResponse.json({ success: true });
  } catch (error) {
    logWithContext("error", "❌ セル一括更新エラー", { error, status: 500 });
    return NextResponse.json(
      { error: "セルの一括更新に失敗しました" },
      { status: 500 }
    );
  }
}
