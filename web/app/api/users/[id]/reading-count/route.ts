import * as userService from "@/lib/services/user-service";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/users/:id/reading-count - リーディングカウントを増加
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const result = await userService.incrementReadingCount(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("リーディングカウント更新エラー:", error);
    return NextResponse.json(
      { error: "リーディングカウントの更新に失敗しました" },
      { status: 500 }
    );
  }
}
