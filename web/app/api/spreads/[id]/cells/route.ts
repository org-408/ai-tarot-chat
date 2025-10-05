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
  try {
    const cells = await getSpreadCellsBySpreadId(id);
    return NextResponse.json(cells);
  } catch (error) {
    console.error(`スプレッド(${id})のセル一覧取得エラー:`, error);
    return NextResponse.json(
      { error: "セル一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// スプレッドにセル追加
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const data = await request.json();
    const cell = await createSpreadCell(id, data);
    return NextResponse.json(cell);
  } catch (error) {
    console.error(`スプレッド(${id})へのセル追加エラー:`, error);
    return NextResponse.json(
      { error: "セルの追加に失敗しました" },
      { status: 500 }
    );
  }
}
