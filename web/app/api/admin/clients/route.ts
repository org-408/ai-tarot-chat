import { logWithContext } from "@/lib/server/logger/logger";
import { adminService } from "@/lib/server/services/admin";
import { requireAdminSession } from "@/lib/server/utils/admin-guard";
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
    const { clients, total } = await adminService.listClients(
      { planCode, keyword },
      { skip: (page - 1) * limit, take: limit }
    );
    return NextResponse.json({ clients, total, page, limit });
  } catch (error) {
    logWithContext("error", "クライアント一覧取得エラー", { error });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
