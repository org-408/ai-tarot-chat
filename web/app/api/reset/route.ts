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
    // client, device, log テーブルをクリア
    await prisma.client.deleteMany({});
    await prisma.device.deleteMany({});
    await prisma.log.deleteMany({});

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
