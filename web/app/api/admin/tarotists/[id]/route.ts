import { logWithContext } from "@/lib/server/logger/logger";
import { tarotistService } from "@/lib/server/services/tarotist";
import { requireAdminSession } from "@/lib/server/utils/admin-guard";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  try {
    const data = await req.json();
    const tarotist = await tarotistService.updateTarotist(id, data, false);
    return NextResponse.json(tarotist);
  } catch (error) {
    logWithContext("error", `タロティスト(${id})更新エラー`, { error });
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// ソフトデリート
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  try {
    const tarotist = await tarotistService.deleteTarotist(id, true);
    return NextResponse.json(tarotist);
  } catch (error) {
    logWithContext("error", `タロティスト(${id})削除エラー`, { error });
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}

// 復元（PATCH）
export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  try {
    const tarotist = await tarotistService.restoreTarotist(id);
    return NextResponse.json(tarotist);
  } catch (error) {
    logWithContext("error", `タロティスト(${id})復元エラー`, { error });
    return NextResponse.json({ error: "復元に失敗しました" }, { status: 500 });
  }
}
