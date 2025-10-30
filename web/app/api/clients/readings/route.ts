import type { ReadingInput } from "@/../shared/lib/types";
import { logWithContext } from "@/lib/server/logger/logger";
import { clientService } from "@/lib/server/services";
import { authService } from "@/lib/server/services/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let clientId = "";
  try {
    logWithContext("info", "ユーザー(client)の占い結果を保存する", {
      path: "/api/clients/readings",
    });

    // sessionチェック
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload || !payload)
      return new Response("unauthorized", { status: 401 });

    logWithContext("debug", "セッション検証完了", { payload });
    clientId = payload.payload.clientId;
    const deviceId = payload.payload.deviceId;
    if (!clientId || !deviceId)
      return new Response("unauthorized", { status: 401 });

    const readingData = (await request.json()) as ReadingInput;
    logWithContext("info", "Client ID, readingData", {
      clientId,
      deviceId,
      readingData,
    });

    // deviceId をセット
    readingData.clientId = clientId;
    readingData.deviceId = deviceId;

    const result = await clientService.saveReading(readingData);
    logWithContext("info", "占い結果保存完了", {
      clientId,
      result,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Bad Request: missing parameters"
    ) {
      logWithContext("error", "占い結果保存エラー: パラメーターエラー", {
        error,
        clientId,
      });
      return NextResponse.json(
        { error, errorMessage: "Bad Request: missing parameters" },
        { status: 400 }
      );
    }
    logWithContext("error", "占い結果保存エラー", {
      error,
      clientId,
    });
    return NextResponse.json(
      { error, errorMessage: "占い結果の保存に失敗しました" },
      { status: 500 }
    );
  }
}

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
    const { take, skip } = await request.json();
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
    return NextResponse.json(readings);
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
