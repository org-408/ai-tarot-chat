import * as userService from "@/lib/services/user-service";
import { NextRequest, NextResponse } from "next/server";

// GET /api/users - ユーザー一覧を取得
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  try {
    const users = await userService.getUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error("ユーザー一覧取得エラー:", error);
    return NextResponse.json(
      { error: "ユーザー一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/users - 新規ユーザーを作成
export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();
    const user = await userService.createUser(userData);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("ユーザー作成エラー:", error);
    return NextResponse.json(
      { error: "ユーザーの作成に失敗しました" },
      { status: 500 }
    );
  }
}
