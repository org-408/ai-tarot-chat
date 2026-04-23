import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/server/logger/logger";
import { rankingService } from "@/lib/server/services/ranking";

// ランキングスナップショット再集計 Cron
// Authorization: Bearer <CRON_SECRET> で保護
// 頻度の目安：1時間毎（Render Cron から叩く）
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await rankingService.refreshAllSnapshots();
    logger.info("Cron: ランキング再集計完了", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logger.error("Cron: ランキング再集計エラー", { error });
    return NextResponse.json(
      { error: "ランキング再集計に失敗しました" },
      { status: 500 }
    );
  }
}
