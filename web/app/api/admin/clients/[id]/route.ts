import { logWithContext } from "@/lib/server/logger/logger";
import { clientService } from "@/lib/server/services/client";
import { requireAdminSession } from "@/lib/server/utils/admin-guard";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// プラン変更
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  try {
    const { planId } = await req.json();
    await clientService.adminChangeClientPlan(id, planId);
    return NextResponse.json({ success: true });
  } catch (error) {
    logWithContext("error", `クライアント(${id})プラン変更エラー`, { error });
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// ソフトデリート
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  try {
    await clientService.deleteAccount(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logWithContext("error", `クライアント(${id})削除エラー`, { error });
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
