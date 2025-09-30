import { authService } from "@/lib/services/auth";
import { readingService } from "@/lib/services/reading";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log(
      "📍 /api/plans/remaining - 本日の占い利用可能残数の確認処理開始"
    );

    // sessionチェック
    const client = await authService.verifyApiRequest(request);
    if ("error" in client || !client)
      return new Response("unauthorized", { status: 401 });

    console.log(`✅ セッション検証完了 (client: ${client.client}`);

    // 占いの利用残数確認
    const remaining = await readingService.getRemainingReadings(client.client);
    return NextResponse.json(remaining);
  } catch (error) {
    console.error("プラン一覧取得エラー:", error);
    return NextResponse.json(
      { error: "プラン一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
