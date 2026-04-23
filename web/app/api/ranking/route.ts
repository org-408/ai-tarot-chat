import { NextResponse } from "next/server";
import logger from "@/lib/server/logger/logger";
import { rankingConfigService } from "@/lib/server/services/ranking-config";
import { rankingService } from "@/lib/server/services/ranking";

// 公開ランキング API
// 認証不要。RankingConfig.publicEnabled が OFF なら 404
export const revalidate = 3600;

export async function GET() {
  try {
    const config = await rankingConfigService.get();
    if (!config.publicEnabled) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const data = await rankingService.getPublicRanking();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    logger.error("ranking API error", { error });
    return NextResponse.json(
      { error: "ランキング取得に失敗しました" },
      { status: 500 }
    );
  }
}
