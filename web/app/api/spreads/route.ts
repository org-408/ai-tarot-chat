import { logWithContext } from "@/lib/logger/logger";
import { createSpread, getSpreads } from "@/lib/services/spread";
import { NextRequest, NextResponse } from "next/server";

// スプレッド一覧取得
export async function GET() {
  logWithContext("info", "📍 /api/spreads - スプレッド一覧取得リクエスト受信", {
    path: "/api/spreads",
  });
  try {
    const spreads = await getSpreads();
    logWithContext("info", "✅ スプレッド一覧取得完了", { spreads });
    return NextResponse.json(spreads);
  } catch (error) {
    logWithContext("error", "❌ スプレッド一覧取得エラー", {
      error,
      status: 500,
    });
    return NextResponse.json(
      { error: "スプレッドの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// スプレッド作成
export async function POST(request: NextRequest) {
  logWithContext("info", "📍 /api/spreads - スプレッド作成リクエスト受信", {
    path: "/api/spreads",
  });
  try {
    const data = await request.json();
    const spread = await createSpread(data);
    logWithContext("info", "✅ スプレッド作成完了", { spread });
    return NextResponse.json(spread);
  } catch (error) {
    logWithContext("error", "❌ スプレッド作成エラー", { error, status: 500 });
    return NextResponse.json(
      { error: "スプレッドの作成に失敗しました" },
      { status: 500 }
    );
  }
}
