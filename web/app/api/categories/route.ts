import { getReadingCategories } from "@/lib/services/master";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const categories = await getReadingCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("カテゴリ一覧取得エラー:", error);
    return NextResponse.json(
      { error: "カテゴリ一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
