// app/api/app/check-state/route.ts
import {
  AppStateCheckLog,
  AppStateCheckRequest,
} from "@/../../shared/lib/types";
import { logWithContext } from "@/lib/logger/logger";
import { authService } from "@/lib/services/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AppStateCheckRequest;

  // 🔥 サーバー側でも既存のlogServiceでログ記録
  logWithContext("info", "[StateCheck] Check request received", {
    event: "server_check_start",
    hasToken: !!body.token,
    deviceId: body.deviceId,
    clientId: body.clientId,
    userId: body.userId,
    platform: body.platform,
    appVersion: body.appVersion,
    path: "/api/app/check-state",
  } as AppStateCheckLog);

  const result = await authService.checkAppStatus(body);

  // 結果をログに記録
  logWithContext("info", "[StateCheck] Check completed", {
    event: "server_check_complete",
    hasToken: !!body.token,
    deviceId: body.deviceId,
    clientId: body.clientId,
    userId: body.userId,
    platform: body.platform,
    appVersion: body.appVersion,
    path: "/api/app/check-state",
  });

  return NextResponse.json(result);
}
