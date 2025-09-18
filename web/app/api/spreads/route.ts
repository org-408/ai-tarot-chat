import { createSpread, getSpreads } from "@/lib/services/spread-service";
import { NextRequest, NextResponse } from "next/server";

// スプレッド一覧取得
export async function GET() {
  try {
    const spreads = await getSpreads();
    return NextResponse.json(spreads);
  } catch (error) {
    console.error("スプレッド一覧取得エラー:", error);
    return NextResponse.json(
      { error: "スプレッドの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// スプレッド作成
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const spread = await createSpread(data);
    return NextResponse.json(spread);
  } catch (error) {
    console.error("スプレッド作成エラー:", error);
    return NextResponse.json(
      { error: "スプレッドの作成に失敗しました" },
      { status: 500 }
    );
  }
}
