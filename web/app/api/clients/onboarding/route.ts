import { logWithContext } from "@/lib/server/logger/logger";
import { authService } from "@/lib/server/services/auth";
import { clientService } from "@/lib/server/services/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let clientId = "";
  try {
    logWithContext("info", "オンボーディングフラグ更新", {
      path: "/api/clients/onboarding",
    });

    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload || !payload)
      return new Response("unauthorized", { status: 401 });

    clientId = payload.payload.clientId;
    if (!clientId) return new Response("unauthorized", { status: 401 });

    const body = (await request.json()) as {
      screen?: "quick" | "personal";
      completed?: boolean;
    };

    if (body.screen !== "quick" && body.screen !== "personal") {
      return NextResponse.json(
        { error: "Invalid screen value" },
        { status: 400 }
      );
    }
    if (typeof body.completed !== "boolean") {
      return NextResponse.json(
        { error: "Invalid completed value" },
        { status: 400 }
      );
    }

    const flags = await clientService.setOnboardingFlag(
      clientId,
      body.screen,
      body.completed
    );

    return NextResponse.json(flags, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logWithContext("error", "オンボーディングフラグ更新エラー", {
      error,
      clientId,
    });
    return NextResponse.json(
      { error: "オンボーディングフラグの更新に失敗しました" },
      { status: 500 }
    );
  }
}
