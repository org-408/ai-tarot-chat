import { logWithContext } from "@/lib/logger/logger";
import {
  createSpreadCell,
  getSpreadCellsBySpreadId,
} from "@/lib/services/spread";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// スプレッドのセル一覧取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  logWithContext(
    "info",
    `📍 /api/spreads/[id]/cells - スプレッド(${id})のセル一覧取得リクエスト受信`,
    { path: `/api/spreads/${id}/cells` }
  );
  try {
    const cells = await getSpreadCellsBySpreadId(id);
    logWithContext("info", `✅ スプレッド(${id})のセル一覧取得完了`, { cells });
    return NextResponse.json(cells);
  } catch (error) {
    logWithContext("error", `❌ スプレッド(${id})のセル一覧取得エラー`, {
      error,
      status: 500,
    });
    return NextResponse.json(
      { error: "セル一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// スプレッドにセル追加
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  logWithContext(
    "info",
    `📍 /api/spreads/[id]/cells - スプレッド(${id})へのセル追加リクエスト受信`,
    { path: `/api/spreads/${id}/cells` }
  );
  try {
    const data = await request.json();
    const cell = await createSpreadCell(id, data);
    logWithContext("info", `✅ スプレッド(${id})へのセル追加完了`, { cell });
    return NextResponse.json(cell);
  } catch (error) {
    logWithContext("error", `❌ スプレッド(${id})へのセル追加エラー`, {
      error,
      status: 500,
    });
    return NextResponse.json(
      { error: "セルの追加に失敗しました" },
      { status: 500 }
    );
  }
}
