import { logWithContext } from "@/lib/server/logger/logger";
import { blogFeatureQueueRepository } from "@/lib/server/repositories/blog-post";
import { requireAdminSession } from "@/lib/server/utils/admin-guard";
import { FeatureQueueStatus } from "@/lib/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession();
  if (response) return response;

  try {
    const status = req.nextUrl.searchParams.get("status") as FeatureQueueStatus | null;
    const items = await blogFeatureQueueRepository.findAll(status ?? undefined);
    return NextResponse.json(items);
  } catch (error) {
    logWithContext("error", "機能キュー一覧取得エラー", { error });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession();
  if (response) return response;

  try {
    const { description } = await req.json();
    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "description は必須です" }, { status: 400 });
    }
    const item = await blogFeatureQueueRepository.create(description.trim());
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    logWithContext("error", "機能キュー追加エラー", { error });
    return NextResponse.json({ error: "追加に失敗しました" }, { status: 500 });
  }
}
