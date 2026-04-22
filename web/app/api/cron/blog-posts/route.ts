import { NextRequest, NextResponse } from "next/server";
import * as blogPostService from "@/lib/server/services/blog-post";
import { blogPostConfigRepository } from "@/lib/server/repositories/blog-post";
import { BlogPostType } from "@/lib/generated/prisma/client";
import logger from "@/lib/server/logger/logger";

// GitHub Actions から定期的に叩かれる Cron エンドポイント
// Authorization: Bearer <CRON_SECRET> で保護
// type を指定して1記事ずつ生成・公開（1日4回 × 各タイプ）
// type 未指定時は全4タイプを一括生成（管理画面・手動実行用）

const VALID_TYPES = Object.values(BlogPostType);

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

    const body = await req.json().catch(() => ({}));
    const type = body.type as BlogPostType | undefined;

    if (type) {
      if (!VALID_TYPES.includes(type)) {
        return NextResponse.json({ error: `不正な type: ${type}` }, { status: 400 });
      }
      const post = await blogPostService.createAutoPost(type, config.phase);
      logger.info("Cron: ブログ1記事生成完了", { type, id: post.id, status: post.status });
      return NextResponse.json({ ok: true, scheduled: { published, failed }, post: { id: post.id, type: post.postType, status: post.status } });
    }

    // type 未指定: 全4記事一括生成
    const { dailyCard, tarotTip, feature, tarotGuide } = await blogPostService.createDailyBlogPosts(config.phase);
    logger.info("Cron: ブログ自動投稿完了（全4記事）", {
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
