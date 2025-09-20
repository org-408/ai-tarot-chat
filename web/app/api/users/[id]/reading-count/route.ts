import * as userService from "@/lib/services/user-service";
import { NextRequest, NextResponse } from "next/server";

// POST /api/users/:id/reading-count - リーディングカウントを増加
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await userService.incrementReadingCount(params.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("リーディングカウント更新エラー:", error);
    return NextResponse.json(
      { error: "リーディングカウントの更新に失敗しました" },
      { status: 500 }
    );
  }
}
