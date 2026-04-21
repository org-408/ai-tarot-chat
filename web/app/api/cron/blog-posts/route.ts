import { NextRequest, NextResponse } from "next/server";
import { BlogPostPhase, BlogPostType } from "@/lib/generated/prisma/client";
import * as blogPostService from "@/lib/server/services/blog-post";
import { blogPostConfigRepository } from "@/lib/server/repositories/blog-post";
import logger from "@/lib/server/logger/logger";

// GitHub Actions から定期的に叩かれる Cron エンドポイント
// Authorization: Bearer <CRON_SECRET> で保護
// Body: { type?: BlogPostType } で記事タイプを明示指定、省略時はphaseに基づいて自動選択

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
    // 自動公開が有効かチェック
    const config = await blogPostConfigRepository.get();
    if (!config.autoPostEnabled) {
      logger.info("Cron: ブログ自動公開が無効のためスキップ");
      return NextResponse.json({ ok: true, skipped: true, reason: "autoPostEnabled is false" });
    }

    // 予約記事を処理
    const { published, failed } = await blogPostService.processDue();
    logger.info("Cron: 予約ブログ記事処理完了", { published, failed });

    // リクエストボディで指定されたタイプで自動生成
    let body: { type?: string } = {};
    try { body = await req.json(); } catch { /* body なし */ }

    // 明示指定がなければ、phaseに応じてタイプをランダム選択
    const phaseTypes = blogPostService.getAutoPostTypesForPhase(config.phase ?? BlogPostPhase.POST_LAUNCH);
    const typeMap: Record<string, BlogPostType> = {
      TAROT_GUIDE: BlogPostType.TAROT_GUIDE,
      TAROT_TIP: BlogPostType.TAROT_TIP,
      APP_PROMO: BlogPostType.APP_PROMO,
      BUILD_IN_PUBLIC: BlogPostType.BUILD_IN_PUBLIC,
    };
    const type = (body.type ? typeMap[body.type] : undefined)
      ?? phaseTypes[Math.floor(Math.random() * phaseTypes.length)];

    const autoPost = await blogPostService.createAutoPost(type, config.phase);
    logger.info("Cron: ブログ自動投稿完了", { id: autoPost.id, type, phase: config.phase, status: autoPost.status });

    return NextResponse.json({
      ok: true,
      scheduled: { published, failed },
      autoPost: { id: autoPost.id, type: autoPost.postType, status: autoPost.status },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Cron: ブログ投稿エラー", { error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
