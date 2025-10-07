import { logWithContext } from "@/lib/logger/logger";
import { authService } from "@/lib/services/auth";
import { clientService } from "@/lib/services/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  let clientId = "";
  const path = "/api/clients/usage";
  try {
    await logWithContext("info", "ユーザー(client)のユーザー利用状況を取得", {
      path,
    });

    // sessionチェック
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload || !payload)
      return new Response("unauthorized", { status: 401 });

    await logWithContext("debug", "セッション検証完了", { payload });
    clientId = payload.payload.clientId;
    if (!clientId) return new Response("unauthorized", { status: 401 });
    await logWithContext("info", "Client ID", { clientId });

    // ユーザー利用状況の取得
    const userStats = await clientService.getUsageAndReset(clientId);
    await logWithContext("info", "ユーザー利用状況取得完了", {
      clientId,
      userStats,
    });
    return NextResponse.json(userStats);
  } catch (error) {
    await logWithContext("error", "ユーザー利用状況取得エラー", {
      error,
      clientId,
    });
    return NextResponse.json(
      { error: "ユーザー利用状況の取得に失敗しました" },
      { status: 500 }
    );
  }
}
