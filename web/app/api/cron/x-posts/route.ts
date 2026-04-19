import { NextRequest, NextResponse } from "next/server";
import { XPostPhase, XPostType } from "@/lib/generated/prisma/client";
import * as xPostService from "@/lib/server/services/x-post";
import { xPostConfigRepository } from "@/lib/server/repositories/x-post";
import logger from "@/lib/server/logger/logger";

// GitHub Actions から定期的に叩かれる Cron エンドポイント
// Authorization: Bearer <CRON_SECRET> で保護
// Body: { type?: XPostType } で投稿タイプを明示指定、省略時はphaseに基づいて自動選択

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
    // 自動投稿が有効かチェック
    const config = await xPostConfigRepository.get();
    if (!config.autoPostEnabled) {
      logger.info("Cron: 自動投稿が無効のためスキップ");
      return NextResponse.json({ ok: true, skipped: true, reason: "autoPostEnabled is false" });
    }

    // 予約投稿を処理
    const { posted, failed } = await xPostService.processDue();
    logger.info("Cron: 予約投稿処理完了", { posted, failed });

    // リクエストボディで指定されたタイプで自動投稿
    let body: { type?: string } = {};
    try { body = await req.json(); } catch { /* body なし */ }

    // 明示指定がなければ、phaseに応じてタイプをランダム選択
    const phaseTypes = xPostService.getAutoPostTypesForPhase(config.phase ?? XPostPhase.POST_LAUNCH);
    const typeMap: Record<string, XPostType> = {
      DAILY_CARD: XPostType.DAILY_CARD,
      APP_PROMO: XPostType.APP_PROMO,
      TAROT_TIP: XPostType.TAROT_TIP,
      BUILD_IN_PUBLIC: XPostType.BUILD_IN_PUBLIC,
    };
    const type = (body.type ? typeMap[body.type] : undefined)
      ?? phaseTypes[Math.floor(Math.random() * phaseTypes.length)];

    const autoPost = await xPostService.createAutoPost(type);
    logger.info("Cron: 自動投稿完了", { id: autoPost.id, type, phase: config.phase, status: autoPost.status });

    return NextResponse.json({
      ok: true,
      scheduled: { posted, failed },
      autoPost: { id: autoPost.id, type: autoPost.postType, status: autoPost.status },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Cron: X投稿エラー", { error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
