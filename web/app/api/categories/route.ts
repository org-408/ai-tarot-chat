import { logWithContext } from "@/lib/logger/logger";
import { getReadingCategories } from "@/lib/services/master";
import { NextResponse } from "next/server";

export async function GET() {
  logWithContext("info", "📍 /api/categories - カテゴリ一覧取得リクエスト受信", { path: "/api/categories" });
  try {
    const categories = await getReadingCategories();
    logWithContext("info", "📍 /api/categories - カテゴリ一覧取得完了", { categories });
    return NextResponse.json(categories);
  } catch (error) {
    logWithContext("error", "❌ カテゴリ一覧取得エラー", { error, status: 500 });
    return NextResponse.json(
      { error: "カテゴリ一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
