import * as userService from "@/lib/services/user-service";
import { NextRequest, NextResponse } from "next/server";

// GET /api/users/email/:email - メールアドレスでユーザーを取得
export async function GET(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const decodedEmail = decodeURIComponent(params.email);
    const user = await userService.getUserByEmail(decodedEmail);
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
