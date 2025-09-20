import * as userService from "@/lib/services/user-service";
import { NextRequest, NextResponse } from "next/server";

// GET /api/users/:id/ai-chat-limit - AIチャット利用制限をチェック
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const canUse = await userService.checkAiChatLimit(params.id);
    return NextResponse.json({ canUse });
  } catch (error) {
    console.error("AIチャット制限チェックエラー:", error);
    return NextResponse.json(
      { error: "AIチャット制限のチェックに失敗しました" },
      { status: 500 }
    );
  }
}
