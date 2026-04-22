import { NextRequest, NextResponse } from "next/server";
import * as xPostService from "@/lib/server/services/x-post";
import { xPostConfigRepository } from "@/lib/server/repositories/x-post";
import logger from "@/lib/server/logger/logger";

// GitHub Actions から定期的に叩かれる Cron エンドポイント（ブログCronの30分後に実行）
// Authorization: Bearer <CRON_SECRET> で保護
// 1日1回実行: DAILY_CARD + TAROT_TIP + BUILD_IN_PUBLIC/APP_PROMO の3投稿を生成
// ブログ記事が存在すればブログURLをリンクとして含めて生成

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
    const config = await xPostConfigRepository.get();
    if (!config.autoPostEnabled) {
      logger.info("Cron: 自動投稿が無効のためスキップ");
      return NextResponse.json({ ok: true, skipped: true, reason: "autoPostEnabled is false" });
    }

    // 予約投稿を処理
    const { posted, failed } = await xPostService.processDue();
    logger.info("Cron: 予約投稿処理完了", { posted, failed });

    // 1日3投稿をブログ連動で生成
    const { dailyCard, tarotTip, feature } = await xPostService.createDailyXPosts(config.phase);

    logger.info("Cron: X自動投稿完了", {
      dailyCard: { id: dailyCard.id, status: dailyCard.status },
      tarotTip: { id: tarotTip.id, status: tarotTip.status },
      feature: { id: feature.id, type: feature.postType, status: feature.status },
    });

    return NextResponse.json({
      ok: true,
      scheduled: { posted, failed },
      posts: {
        dailyCard: { id: dailyCard.id, status: dailyCard.status },
        tarotTip: { id: tarotTip.id, status: tarotTip.status },
        feature: { id: feature.id, type: feature.postType, status: feature.status },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Cron: X投稿エラー", { error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
