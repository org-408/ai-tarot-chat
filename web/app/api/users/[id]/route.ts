import * as userService from "@/lib/services/user-service";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/users/:id - 特定のユーザーを取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const user = await userService.getUserById(id);
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

// PUT /api/users/:id - ユーザー情報を更新
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const userData = await request.json();
    const user = await userService.updateUserById(id, userData);
    return NextResponse.json(user);
  } catch (error) {
    console.error("ユーザー更新エラー:", error);
    return NextResponse.json(
      { error: "ユーザーの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/:id - ユーザーを削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await userService.deleteUserById(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ユーザー削除エラー:", error);
    return NextResponse.json(
      { error: "ユーザーの削除に失敗しました" },
      { status: 500 }
    );
  }
}
