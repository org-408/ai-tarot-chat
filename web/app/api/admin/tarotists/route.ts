import { logWithContext } from "@/lib/server/logger/logger";
import { tarotistService } from "@/lib/server/services/tarotist";
import { requireAdminSession } from "@/lib/server/utils/admin-guard";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  try {
    // 削除済みも含めて全件取得
    const tarotists = await tarotistService.getAllTarotists(false);
    return NextResponse.json(tarotists);
  } catch (error) {
    logWithContext("error", "タロティスト一覧取得エラー", { error });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession();
  if (response) return response;

  try {
    const data = await req.json();
    const tarotist = await tarotistService.createTarotist(data);
    return NextResponse.json(tarotist, { status: 201 });
  } catch (error) {
    logWithContext("error", "タロティスト作成エラー", { error });
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
