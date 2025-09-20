import * as userService from "@/lib/services/user-service";
import { NextRequest, NextResponse } from "next/server";

// POST /api/users/anonymous - 匿名ユーザーを作成
export async function POST(request: NextRequest) {
  try {
    const { deviceId } = await request.json();
    if (!deviceId) {
      return NextResponse.json(
        { error: "デバイスIDが必要です" },
        { status: 400 }
      );
    }

    // まず既存のユーザーを検索
    const existingUser = await userService.getUserByDeviceId(deviceId);
    if (existingUser) {
      return NextResponse.json(existingUser);
    }

    // 新しい匿名ユーザーを作成
    const user = await userService.createAnonymousUser(deviceId);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("匿名ユーザー作成エラー:", error);
    return NextResponse.json(
      { error: "匿名ユーザーの作成に失敗しました" },
      { status: 500 }
    );
  }
}
