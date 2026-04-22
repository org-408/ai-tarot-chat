import { NextRequest, NextResponse } from "next/server";
import * as xPostService from "@/lib/server/services/x-post";
import { xPostConfigRepository } from "@/lib/server/repositories/x-post";
import { XPostType } from "@/lib/generated/prisma/client";
import logger from "@/lib/server/logger/logger";

// GitHub Actions から定期的に叩かれる Cron エンドポイント（ブログCronの30分後に実行）
// Authorization: Bearer <CRON_SECRET> で保護
// type を指定して1投稿ずつ生成（1日3回 × 各タイプ）
// type 未指定時は全3タイプを一括生成（管理画面・手動実行用）

const VALID_TYPES: XPostType[] = [XPostType.DAILY_CARD, XPostType.TAROT_TIP, XPostType.BUILD_IN_PUBLIC, XPostType.APP_PROMO];

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

    const body = await req.json().catch(() => ({}));
    const type = body.type as XPostType | undefined;

    if (type) {
      if (!VALID_TYPES.includes(type)) {
        return NextResponse.json({ error: `不正な type: ${type}` }, { status: 400 });
      }
      const post = await xPostService.createSingleXPost(type, config.phase);
      logger.info("Cron: X1投稿生成完了", { type, id: post.id, status: post.status });
      return NextResponse.json({
        ok: true,
        scheduled: { posted, failed },
        post: { id: post.id, type: post.postType, status: post.status },
      });
    }

    // type 未指定: 全3投稿一括生成（管理画面・手動実行用）
    const { dailyCard, tarotTip, feature } = await xPostService.createDailyXPosts(config.phase);
    logger.info("Cron: X自動投稿完了（全3投稿）", {
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
