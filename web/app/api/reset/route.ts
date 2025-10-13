import { logWithContext } from "@/lib/logger/logger";
import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const secret = body.AUTH_SECRET;

  // 環境変数からシークレット取得
  const expectedSecret = process.env.AUTH_SECRET;

  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // client, device, log, user,  テーブルをクリア
    await prisma.client.deleteMany({});
    await prisma.device.deleteMany({});
    await prisma.log.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});

    logWithContext("info", "Database reset successfully", {
      path: "/api/reset",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logWithContext("error", "Error resetting database", {
      error,
      path: "/api/reset",
    });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
