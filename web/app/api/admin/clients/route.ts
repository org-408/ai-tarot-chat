import { logWithContext } from "@/lib/server/logger/logger";
import { requireAdminSession } from "@/lib/server/utils/admin-guard";
import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
  const planCode = searchParams.get("plan") ?? undefined;
  const keyword = searchParams.get("q") ?? undefined;

  try {
    const where = {
      deletedAt: null,
      ...(planCode && planCode !== "ALL"
        ? { plan: { code: planCode } }
        : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: "insensitive" as const } },
              { email: { contains: keyword, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          plan: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, email: true } },
          devices: { select: { id: true, platform: true, lastSeenAt: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.client.count({ where }),
    ]);

    return NextResponse.json({ clients, total, page, limit });
  } catch (error) {
    logWithContext("error", "クライアント一覧取得エラー", { error });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
