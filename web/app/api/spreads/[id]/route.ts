import { logWithContext } from "@/lib/logger/logger";
import { spreadService } from "@/lib/services/spread";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// 特定スプレッド取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  logWithContext(
    "info",
    `📍 /api/spreads/[id] - スプレッド(${id})取得リクエスト受信`,
    { path: `/api/spreads/${id}` }
  );
  try {
    const spread = await spreadService.getSpreadById(id);
    if (!spread) {
      logWithContext("error", `❌ スプレッド(${id})が見つかりません`, {
        status: 404,
      });
      return NextResponse.json(
        { error: "スプレッドが見つかりません" },
        { status: 404 }
      );
    }
    logWithContext("info", `✅ スプレッド(${id})取得完了`, { spread });
    return NextResponse.json(spread);
  } catch (error) {
    logWithContext("error", `❌ スプレッド(${id})取得エラー`, {
      error,
      status: 500,
    });
    return NextResponse.json(
      { error: "スプレッドの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// スプレッド更新
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  logWithContext(
    "info",
    `📍 /api/spreads/[id] - スプレッド(${id})更新リクエスト受信`,
    { path: `/api/spreads/${id}` }
  );
  try {
    const data = await request.json();
    const spread = await spreadService.updateSpreadById(id, data);
    logWithContext("info", `✅ スプレッド(${id})更新完了`, { spread });
    return NextResponse.json(spread);
  } catch (error) {
    logWithContext("error", `❌ スプレッド(${id})更新エラー`, {
      error,
      status: 500,
    });
    return NextResponse.json(
      { error: "スプレッドの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// スプレッド削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  logWithContext(
    "info",
    `📍 /api/spreads/[id] - スプレッド(${id})削除リクエスト受信`,
    { path: `/api/spreads/${id}` }
  );
  try {
    await spreadService.deleteSpreadById(id);
    logWithContext("info", `✅ スプレッド(${id})削除完了`);
    return NextResponse.json({ success: true });
  } catch (error) {
    logWithContext("error", `❌ スプレッド(${id})削除エラー`, {
      error,
      status: 500,
    });
    return NextResponse.json(
      { error: "スプレッドの削除に失敗しました" },
      { status: 500 }
    );
  }
}
