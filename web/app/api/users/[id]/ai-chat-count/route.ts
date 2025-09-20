import * as userService from "@/lib/services/user-service";
import { NextRequest, NextResponse } from "next/server";

// POST /api/users/:id/ai-chat-count - AIチャットカウントを増加
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await userService.incrementAiChatCount(params.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("AIチャットカウント更新エラー:", error);
    return NextResponse.json(
      { error: "AIチャットカウントの更新に失敗しました" },
      { status: 500 }
    );
  }
}
