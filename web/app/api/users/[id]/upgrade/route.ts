import * as userService from "@/lib/services/user-service";
import { NextRequest, NextResponse } from "next/server";

// PUT /api/users/:id/upgrade - 匿名ユーザーを登録ユーザーにアップグレード
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json(
        { error: "メールアドレスが必要です" },
        { status: 400 }
      );
    }

    // メールアドレスが既に使用されているか確認
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser && existingUser.id !== params.id) {
      return NextResponse.json(
        { error: "このメールアドレスは既に使用されています" },
        { status: 409 }
      );
    }

    // ユーザーをアップグレード
    const user = await userService.upgradeToRegisteredUser(params.id, email);
    return NextResponse.json(user);
  } catch (error) {
    console.error("ユーザーアップグレードエラー:", error);
    return NextResponse.json(
      { error: "ユーザーのアップグレードに失敗しました" },
      { status: 500 }
    );
  }
}
