import { NextRequest, NextResponse } from "next/server";
import * as blogPostService from "@/lib/server/services/blog-post";
import { blogPostConfigRepository } from "@/lib/server/repositories/blog-post";
import logger from "@/lib/server/logger/logger";

// GitHub Actions から定期的に叩かれる Cron エンドポイント
// Authorization: Bearer <CRON_SECRET> で保護
// 1日1回実行: DAILY_CARD + TAROT_TIP + BUILD_IN_PUBLIC/APP_PROMO + TAROT_GUIDE の4記事を生成

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
    const config = await blogPostConfigRepository.get();
    if (!config.autoPostEnabled) {
      logger.info("Cron: ブログ自動公開が無効のためスキップ");
      return NextResponse.json({ ok: true, skipped: true, reason: "autoPostEnabled is false" });
    }

    // 予約記事を処理
    const { published, failed } = await blogPostService.processDue();
    logger.info("Cron: 予約ブログ記事処理完了", { published, failed });

    // 1日4投稿を一括生成
    const { dailyCard, tarotTip, feature, tarotGuide } = await blogPostService.createDailyBlogPosts(
      config.phase,
    );

    logger.info("Cron: ブログ自動投稿完了", {
      dailyCard: { id: dailyCard.id, status: dailyCard.status },
      tarotTip: { id: tarotTip.id, status: tarotTip.status },
      feature: { id: feature.id, type: feature.postType, status: feature.status },
      tarotGuide: { id: tarotGuide.id, status: tarotGuide.status },
    });

    return NextResponse.json({
      ok: true,
      scheduled: { published, failed },
      posts: {
        dailyCard: { id: dailyCard.id, status: dailyCard.status },
        tarotTip: { id: tarotTip.id, status: tarotTip.status },
        feature: { id: feature.id, type: feature.postType, status: feature.status },
        tarotGuide: { id: tarotGuide.id, status: tarotGuide.status },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Cron: ブログ投稿エラー", { error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
