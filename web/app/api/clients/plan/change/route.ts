import { logWithContext } from "@/lib/server/logger/logger";
import { authService } from "@/lib/server/services/auth";
import { clientService } from "@/lib/server/services/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  logWithContext(
    "info",
    "📍 /api/clients/plan/change - プラン変更リクエスト受信",
    {
      path: "/api/clients/plan/change",
    }
  );
  let clientId: string | undefined;
  try {
    // AuthService経由でセッション検証
    const payload = await authService.verifyApiRequest(request);
    if (
      "error" in payload ||
      !payload ||
      !payload.payload.deviceId ||
      !payload.payload.clientId
    ) {
      logWithContext("error", "❌ セッション検証エラー", {
        payload,
        status: 401,
      });
      return new Response("unauthorized", { status: 401 });
    }
    clientId = payload.payload.clientId;
    logWithContext("info", `✅ セッション検証完了`, { payload, clientId });

    // リクエストボディ取得
    const { code } = await request.json();
    if (!code) {
      logWithContext("error", "❌ planCode が不足", {
        clientId,
        code,
        status: 400,
      });
      return new Response("invalid request", { status: 400 });
    }
    logWithContext("info", `🔄 プラン変更処理開始`, { clientId, code });

    // プラン変更処理
    const client = await clientService.changePlan(clientId, code);
    // プラン変更後の利用状況を取得
    const usage = await clientService.getUsageAndReset(clientId);

    // クライアントが null ならエラー
    if (!client || !client.plan || !usage || !usage.plan) {
      logWithContext(
        "error",
        "❌ クライアント or プラン or 利用状況が見つからない",
        {
          clientId,
          code,
          usage,
          status: 404,
        }
      );
      return new Response("client|plan|usage not found", { status: 404 });
    }
    if (client.plan.code !== code || usage.plan.code !== code) {
      logWithContext("error", "❌ プラン変更ミスマッチ", {
        clientId,
        expected: code,
        actualClient: client.plan.code,
        actualUsage: usage.plan.code,
        status: 500,
      });
      return new Response("plan change mismatch", { status: 500 });
    }

    logWithContext("info", `✅ プラン変更完了`, {
      clientId,
      success: true,
      usage,
    });
    return NextResponse.json({
      success: true,
      usage,
    });
  } catch (error) {
    logWithContext("error", "❌ プラン変更エラー", {
      clientId,
      error,
      status: 500,
    });
    return NextResponse.json(
      { error, errorMessage: "プラン変更に失敗しました" },
      { status: 500 }
    );
  }
}
