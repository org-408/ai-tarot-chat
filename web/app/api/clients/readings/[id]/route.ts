import { logWithContext } from "@/lib/server/logger/logger";
import { clientService } from "@/lib/server/services";
import { authService } from "@/lib/server/services/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let clientId = "";
  try {
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload || !payload)
      return new Response("unauthorized", { status: 401 });

    clientId = payload.payload.clientId;
    const { id } = await params;

    const reading = await clientService.getReadingById(clientId, id);
    if (!reading) return new Response("not found", { status: 404 });

    return NextResponse.json(reading);
  } catch (error) {
    logWithContext("error", "占い履歴詳細取得エラー", { error, clientId });
    return NextResponse.json(
      { error: "占い履歴の取得に失敗しました" },
      { status: 500 }
    );
  }
}
