import { getSpreadsByCategory } from "@/lib/services/spread-service";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// カテゴリ別スプレッド一覧取得
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const spreads = await getSpreadsByCategory(id);
    return NextResponse.json(spreads);
  } catch (error) {
    console.error(`カテゴリ(${id})別スプレッド一覧取得エラー:`, error);
    return NextResponse.json(
      { error: "カテゴリ別スプレッド一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
