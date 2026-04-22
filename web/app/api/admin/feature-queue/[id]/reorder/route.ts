import { logWithContext } from "@/lib/server/logger/logger";
import { blogFeatureQueueRepository } from "@/lib/server/repositories/blog-post";
import { requireAdminSession } from "@/lib/server/utils/admin-guard";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdminSession();
  if (response) return response;

  try {
    const { id } = await params;
    const { direction } = await req.json();
    if (direction !== "up" && direction !== "down") {
      return NextResponse.json({ error: "direction は up または down です" }, { status: 400 });
    }
    await blogFeatureQueueRepository.reorder(id, direction);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logWithContext("error", "機能キュー並び替えエラー", { error });
    return NextResponse.json({ error: "並び替えに失敗しました" }, { status: 500 });
  }
}
