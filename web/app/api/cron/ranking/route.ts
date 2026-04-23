import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/server/logger/logger";
import { rankingConfigService } from "@/lib/server/services/ranking-config";
import { rankingService } from "@/lib/server/services/ranking";

// ランキング 1時間バケット集計 Cron
// Authorization: Bearer <CRON_SECRET> で保護
// 頻度: GitHub Actions から毎時15分に呼ばれる（.github/workflows/ranking.yml 参照）
// 毎時00分は統計 cron 用に開けてある
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
    const config = await rankingConfigService.get();
    if (!config.collectionEnabled) {
      logger.info("Cron: ランキング自動集計が無効のためスキップ");
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "collectionEnabled is false",
      });
    }

    const result = await rankingService.aggregateBucket();
    logger.info("Cron: ランキング 1時間バケット集計完了", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logger.error("Cron: ランキング集計エラー", { error });
    return NextResponse.json(
      { error: "ランキング集計に失敗しました" },
      { status: 500 }
    );
  }
}
