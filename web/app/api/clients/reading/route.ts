import { logWithContext } from "@/lib/logger/logger";
import { authService } from "@/lib/services/auth";
import { clientService } from "@/lib/services/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  let clientId = "";
  try {
    logWithContext("info", "ユーザー(client)のユーザー利用状況を取得", {
      path: "/api/clients/reading",
    });

    // sessionチェック
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload || !payload)
      return new Response("unauthorized", { status: 401 });

    logWithContext("debug", "セッション検証完了", { payload });
    clientId = payload.payload.clientId;
    const { category, spreadId } = await request.json();
    if (!clientId) return new Response("unauthorized", { status: 401 });
    logWithContext("info", "Client ID, category, spreadId", {
      clientId,
      category,
      spreadId,
    });

    // ユーザー利用状況の取得
    const userStats = await clientService.readingDone(
      clientId,
      category,
      spreadId
    );
    logWithContext("info", "占い開始", {
      clientId,
      userStats,
    });
    return NextResponse.json(userStats);
  } catch (error) {
    logWithContext("error", "ユーザー利用状況取得エラー", {
      error,
      clientId,
    });
    return NextResponse.json(
      { error: "ユーザー利用状況の取得に失敗しました" },
      { status: 500 }
    );
  }
}
