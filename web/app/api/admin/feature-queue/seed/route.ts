import { logWithContext } from "@/lib/server/logger/logger";
import { blogFeatureQueueRepository } from "@/lib/server/repositories/blog-post";
import { requireAdminSession } from "@/lib/server/utils/admin-guard";
import { NextResponse } from "next/server";

export async function POST() {
  const { response } = await requireAdminSession();
  if (response) return response;

  try {
    const count = await blogFeatureQueueRepository.seedDefaults();
    return NextResponse.json({ count });
  } catch (error) {
    logWithContext("error", "機能キューシードエラー", { error });
    return NextResponse.json({ error: "インポートに失敗しました" }, { status: 500 });
  }
}
