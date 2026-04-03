import type { SaveReadingInput } from "@/../shared/lib/types";
import { logWithContext } from "@/lib/server/logger/logger";
import { clientService } from "@/lib/server/services";
import { authService } from "@/lib/server/services/auth";
import {
  createReadingErrorResponse,
  createReadingUnexpectedErrorResponse,
  ReadingRouteError,
} from "@/lib/server/utils/reading-error";
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

    const readingData = (await request.json()) as SaveReadingInput;
    logWithContext("info", "Client ID, readingData", {
      clientId,
      deviceId,
      readingData,
    });

    // clientId, deviceId をセット
    readingData.clientId = clientId;
    readingData.deviceId = deviceId;

    // 占い結果の保存
    const result = await clientService.saveReading(readingData);
    logWithContext("info", "占い結果保存完了", {
      clientId,
      result,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReadingRouteError) {
      logWithContext("warn", "占い結果保存エラー: 制御されたエラー", {
        error,
        clientId,
      });
      return createReadingErrorResponse({
        code: error.code,
        message: error.message,
        status: error.status,
        phase: error.phase,
        retryable: error.retryable,
        details: error.details,
      });
    }
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
    return createReadingUnexpectedErrorResponse(error, {
      code: "INTERNAL_ERROR",
      message: "占い結果の保存に失敗しました",
      status: 500,
      phase: "simple",
    });
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
