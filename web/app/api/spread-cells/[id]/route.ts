import {
  deleteSpreadCellById,
  getSpreadCellById,
  updateSpreadCellById,
} from "@/lib/services/spread-service";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: {
    id: string;
  };
}

// 特定セル取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const cell = await getSpreadCellById(params.id);
    if (!cell) {
      return NextResponse.json(
        { error: "セルが見つかりません" },
        { status: 404 }
      );
    }
    return NextResponse.json(cell);
  } catch (error) {
    console.error(`セル(${params.id})取得エラー:`, error);
    return NextResponse.json(
      { error: "セルの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// セル更新
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const data = await request.json();
    const cell = await updateSpreadCellById(params.id, data);
    return NextResponse.json(cell);
  } catch (error) {
    console.error(`セル(${params.id})更新エラー:`, error);
    return NextResponse.json(
      { error: "セルの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// セル削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await deleteSpreadCellById(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`セル(${params.id})削除エラー:`, error);
    return NextResponse.json(
      { error: "セルの削除に失敗しました" },
      { status: 500 }
    );
  }
}
