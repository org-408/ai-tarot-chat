import { NextRequest, NextResponse } from "next/server";
import { XPostType } from "@prisma/client";
import * as xPostService from "@/lib/server/services/x-post";
import { xPostRepository } from "@/lib/server/repositories/x-post";
import logger from "@/lib/server/logger/logger";

// GitHub Actions から定期的に叩かれる Cron エンドポイント
// Authorization: Bearer <CRON_SECRET> で保護

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
    // 1. 予約投稿を処理
    const { posted, failed } = await xPostService.processDue();
    logger.info("Cron: 予約投稿処理完了", { posted, failed });

    // 2. 今日の自動投稿がまだなければ実行
    const hasTodayPost = await xPostRepository.hasTodayAutoPost();
    let autoPost = null;

    if (!hasTodayPost) {
      // ローテーション: 今日の曜日に合わせて投稿タイプを選択
      const dayOfWeek = new Date().getDay(); // 0=日, 1=月, ...
      const typeRotation: XPostType[] = [
        XPostType.DAILY_CARD,  // 日
        XPostType.TAROT_TIP,   // 月
        XPostType.DAILY_CARD,  // 火
        XPostType.APP_PROMO,   // 水
        XPostType.DAILY_CARD,  // 木
        XPostType.TAROT_TIP,   // 金
        XPostType.APP_PROMO,   // 土
      ];
      const type = typeRotation[dayOfWeek];

      autoPost = await xPostService.createAutoPost(type);
      logger.info("Cron: 自動投稿完了", { id: autoPost.id, type, status: autoPost.status });
    }

    return NextResponse.json({
      ok: true,
      scheduled: { posted, failed },
      autoPost: autoPost
        ? { id: autoPost.id, type: autoPost.postType, status: autoPost.status }
        : null,
      skippedAutoPost: hasTodayPost,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Cron: X投稿エラー", { error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
