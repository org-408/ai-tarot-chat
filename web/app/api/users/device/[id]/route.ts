import { getUserByDeviceId } from "@/lib/services/user-service";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/users/device/:id - デバイスIDでユーザーを取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const user = await getUserByDeviceId(id);
    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("ユーザー取得エラー:", error);
    return NextResponse.json(
      { error: "ユーザーの取得に失敗しました" },
      { status: 500 }
    );
  }
}
