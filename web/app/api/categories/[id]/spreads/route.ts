import { getSpreadsByCategory } from "@/lib/services/spread-service";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: {
    id: string;
  };
}

// カテゴリ別スプレッド一覧取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const spreads = await getSpreadsByCategory(params.id);
    return NextResponse.json(spreads);
  } catch (error) {
    console.error(`カテゴリ(${params.id})別スプレッド一覧取得エラー:`, error);
    return NextResponse.json(
      { error: "カテゴリ別スプレッド一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
