import { authService } from "@/lib/services/auth";
import { clientService } from "@/lib/services/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  let clientId = "";
  try {
    console.log(
      "📍 /api/clients/usage - ユーザー(client)のユーザー利用状況を取得"
    );

    // sessionチェック
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload || !payload)
      return new Response("unauthorized", { status: 401 });

    console.log(`✅ セッション検証完了 (payload: ${payload.payload}`);
    clientId = payload.payload.clientId;
    if (!clientId) return new Response("unauthorized", { status: 401 });
    console.log(`Client ID: ${clientId}`);

    // ユーザー利用状況の取得
    const userStats = await clientService.getUsageAndReset(clientId);
    return NextResponse.json(userStats);
  } catch (error) {
    console.error("ユーザー利用状況取得エラー:", error, clientId);
    return NextResponse.json(
      { error: "ユーザー利用状況の取得に失敗しました" },
      { status: 500 }
    );
  }
}
