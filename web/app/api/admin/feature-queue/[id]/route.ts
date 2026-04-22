import { logWithContext } from "@/lib/server/logger/logger";
import { blogFeatureQueueRepository } from "@/lib/server/repositories/blog-post";
import { requireAdminSession } from "@/lib/server/utils/admin-guard";
import { FeatureQueueStatus } from "@/lib/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdminSession();
  if (response) return response;

  try {
    const { id } = await params;
    const body = await req.json();
    const data: { description?: string; sortOrder?: number } = {};
    if (typeof body.description === "string") data.description = body.description.trim();
    if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;

    const item = await blogFeatureQueueRepository.update(id, data);
    return NextResponse.json(item);
  } catch (error) {
    logWithContext("error", "機能キュー更新エラー", { error });
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdminSession();
  if (response) return response;

  try {
    const { id } = await params;
    const item = await blogFeatureQueueRepository.findById(id);
    if (!item) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    if (item.status === FeatureQueueStatus.PUBLISHED) {
      return NextResponse.json({ error: "公開済みのアイテムは削除できません" }, { status: 400 });
    }
    await blogFeatureQueueRepository.delete(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logWithContext("error", "機能キュー削除エラー", { error });
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
