import * as userService from "@/lib/services/user-service";
import { NextRequest, NextResponse } from "next/server";

// PUT /api/users/:id/plan - ユーザープランを更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { planType, subscriptionStatus, subscriptionEndDate } =
      await request.json();
    if (!planType || !subscriptionStatus) {
      return NextResponse.json(
        { error: "プランタイプとサブスクリプションステータスが必要です" },
        { status: 400 }
      );
    }

    // ユーザープランを更新
    const user = await userService.updateUserPlan(
      params.id,
      planType,
      subscriptionStatus,
      subscriptionEndDate ? new Date(subscriptionEndDate) : undefined
    );
    return NextResponse.json(user);
  } catch (error) {
    console.error("プラン更新エラー:", error);
    return NextResponse.json(
      { error: "ユーザープランの更新に失敗しました" },
      { status: 500 }
    );
  }
}
