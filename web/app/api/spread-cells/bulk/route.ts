import { bulkUpdateSpreadCells } from "@/lib/services/spread-service";
import { NextRequest, NextResponse } from "next/server";

// 複数セル一括更新
export async function PUT(request: NextRequest) {
  try {
    const { cells } = await request.json();
    if (!Array.isArray(cells)) {
      return NextResponse.json(
        { error: "正しいセルデータが提供されていません" },
        { status: 400 }
      );
    }
    await bulkUpdateSpreadCells(cells);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("セル一括更新エラー:", error);
    return NextResponse.json(
      { error: "セルの一括更新に失敗しました" },
      { status: 500 }
    );
  }
}
