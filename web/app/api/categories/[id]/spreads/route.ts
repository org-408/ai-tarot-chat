import { logWithContext } from "@/lib/logger/logger";
import { getSpreadsByCategory } from "@/lib/services/spread";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// カテゴリ別スプレッド一覧取得
export async function GET(request: Request, { params }: RouteParams) {
  logWithContext("info", "📍 /api/categories/[id]/spreads - カテゴリ別スプレッド一覧取得リクエスト受信", { path: `/api/categories/${(await params).id}/spreads` });
  const { id } = await params;
  try {
    const spreads = await getSpreadsByCategory(id);
    logWithContext("info", "📍 /api/categories/[id]/spreads - カテゴリ別スプレッド一覧取得完了", { spreads });
    return NextResponse.json(spreads);
  } catch (error) {
    logWithContext("error", "❌ カテゴリ別スプレッド一覧取得エラー", { error, status: 500 });
    return NextResponse.json(
      { error: "カテゴリ別スプレッド一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
