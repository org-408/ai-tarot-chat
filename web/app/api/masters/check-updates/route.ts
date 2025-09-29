import { authService } from "@/lib/services/auth";
import { checkMasterDataUpdates } from "@/lib/services/master";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const auth = await authService.verifyApiRequest(request);
    if ("error" in auth) return auth.error;

    // リクエストボディ取得
    const { lastUpdatedAt } = await request.json();

    // 更新チェック
    const needsUpdate = await checkMasterDataUpdates(lastUpdatedAt);

    return NextResponse.json({ needsUpdate });
  } catch (error) {
    console.error("更新チェックエラー:", error);
    return NextResponse.json(
      { error: "更新チェックに失敗しました" },
      { status: 500 }
    );
  }
}
