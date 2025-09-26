import { authService } from "@/lib/services/auth";
import { readingService } from "@/lib/services/reading";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // バリデーション（Zodなど使用推奨）
    if (!body.deviceId || !body.spreadId || !body.categoryId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // デバイス連携（必要に応じてユーザー取得/作成）
    const { client } = await authService.linkDevice(
      body.deviceId,
      body.clientId
    );

    // ビジネスロジックはServiceに委譲
    const reading = await readingService.executeReading({
      clientId: client.id,
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
