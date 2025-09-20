import * as userService from "@/lib/services/user-service";
import { NextRequest, NextResponse } from "next/server";

// GET /api/users/:id/reading-limit - リーディング利用制限をチェック
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const canUse = await userService.checkReadingLimit(params.id);
    return NextResponse.json({ canUse });
  } catch (error) {
    console.error("リーディング制限チェックエラー:", error);
    return NextResponse.json(
      { error: "リーディング制限のチェックに失敗しました" },
      { status: 500 }
    );
  }
}
