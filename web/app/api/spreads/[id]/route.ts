import {
  deleteSpreadById,
  getSpreadById,
  updateSpreadById,
} from "@/lib/services/spread-service";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: {
    id: string;
  };
}

// 特定スプレッド取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const spread = await getSpreadById(params.id);
    if (!spread) {
      return NextResponse.json(
        { error: "スプレッドが見つかりません" },
        { status: 404 }
      );
    }
    return NextResponse.json(spread);
  } catch (error) {
    console.error(`スプレッド(${params.id})取得エラー:`, error);
    return NextResponse.json(
      { error: "スプレッドの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// スプレッド更新
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const data = await request.json();
    const spread = await updateSpreadById(params.id, data);
    return NextResponse.json(spread);
  } catch (error) {
    console.error(`スプレッド(${params.id})更新エラー:`, error);
    return NextResponse.json(
      { error: "スプレッドの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// スプレッド削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await deleteSpreadById(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`スプレッド(${params.id})削除エラー:`, error);
    return NextResponse.json(
      { error: "スプレッドの削除に失敗しました" },
      { status: 500 }
    );
  }
}
