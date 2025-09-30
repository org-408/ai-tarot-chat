import { authService } from "@/lib/services/auth";
import { readingService } from "@/lib/services/reading";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload || !payload)
      return new Response("unauthorized", { status: 401 });

    console.log(`✅ セッション検証完了 (payload: ${payload.payload}`);

    const body = await request.json();

    // バリデーション（Zodなど使用推奨）
    if (!body.deviceId || !body.spreadId || !body.categoryId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ビジネスロジックはServiceに委譲
    const reading = await readingService.executeReading({
      clientId: payload.payload.clientId,
      deviceId: body.deviceId,
      spreadId: body.spreadId,
      categoryId: body.categoryId,
      tarotistId: body.tarotistId,
    });

    return NextResponse.json(reading);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("limit exceeded")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Reading creation failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    // ビジネスロジックはServiceに委譲
    const readings = await readingService.getReadingHistory(clientId);

    return NextResponse.json(readings);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not available")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Reading fetch failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
