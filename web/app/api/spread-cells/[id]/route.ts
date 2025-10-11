import { logWithContext } from "@/lib/logger/logger";
import { spreadService } from "@/lib/services/spread";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// 特定セル取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  logWithContext(
    "info",
    `📍 /api/spread-cells/[id] - セル(${id})取得リクエスト受信`,
    { path: `/api/spread-cells/${id}` }
  );
  try {
    const cell = await spreadService.getSpreadCellById(id);
    if (!cell) {
      logWithContext("error", `❌ セル(${id})が見つかりません`, {
        status: 404,
      });
      return NextResponse.json(
        { error: "セルが見つかりません" },
        { status: 404 }
      );
    }
    logWithContext("info", `✅ セル(${id})取得完了`, { cell });
    return NextResponse.json(cell);
  } catch (error) {
    logWithContext("error", `❌ セル(${id})取得エラー`, { error, status: 500 });
    return NextResponse.json(
      { error: "セルの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// セル更新
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  logWithContext(
    "info",
    `📍 /api/spread-cells/[id] - セル(${id})更新リクエスト受信`,
    { path: `/api/spread-cells/${id}` }
  );
  try {
    const data = await request.json();
    const cell = await spreadService.updateSpreadCellById(id, data);
    logWithContext("info", `✅ セル(${id})更新完了`, { cell });
    return NextResponse.json(cell);
  } catch (error) {
    logWithContext("error", `❌ セル(${id})更新エラー`, { error, status: 500 });
    return NextResponse.json(
      { error: "セルの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// セル削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  logWithContext(
    "info",
    `📍 /api/spread-cells/[id] - セル(${id})削除リクエスト受信`,
    { path: `/api/spread-cells/${id}` }
  );
  try {
    await spreadService.deleteSpreadCellById(id);
    logWithContext("info", `✅ セル(${id})削除完了`);
    return NextResponse.json({ success: true });
  } catch (error) {
    logWithContext("error", `❌ セル(${id})削除エラー`, { error, status: 500 });
    return NextResponse.json(
      { error: "セルの削除に失敗しました" },
      { status: 500 }
    );
  }
}
