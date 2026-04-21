import { logWithContext } from "@/lib/server/logger/logger";
import { clientService } from "@/lib/server/services";
import { authService } from "@/lib/server/services/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  let clientId = "";
  try {
    logWithContext("info", "ユーザー(client)の占い履歴を取得する", {
      path: "/api/clients/readings",
    });

    // sessionチェック
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload || !payload)
      return new Response("unauthorized", { status: 401 });

    logWithContext("debug", "セッション検証完了", { payload });
    clientId = payload.payload.clientId;
    const { searchParams } = request.nextUrl;
    const take = searchParams.get("take") ? Number(searchParams.get("take")) : undefined;
    const skip = searchParams.get("skip") ? Number(searchParams.get("skip")) : undefined;
    if (!clientId) return new Response("unauthorized", { status: 401 });
    logWithContext("info", "Client ID, category, spread", {
      clientId,
      take,
      skip,
    });

    // 占い履歴の取得
    const readings = await clientService.getReadingHistory(
      clientId,
      take,
      skip
    );
    logWithContext("info", "占い履歴取得完了", {
      clientId,
      readings,
    });
    return NextResponse.json(readings, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logWithContext("error", "占い履歴取得エラー", {
      error,
      clientId,
    });
    return NextResponse.json(
      { error: "占い履歴の取得に失敗しました" },
      { status: 500 }
    );
  }
}
