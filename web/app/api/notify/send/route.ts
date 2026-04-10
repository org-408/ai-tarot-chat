import { notificationService } from "@/lib/server/services/notification";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_SECRET = process.env.ADMIN_API_SECRET;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!ADMIN_SECRET || authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title: string = body?.title ?? "";
  const text: string = body?.body ?? "";
  const platform: string = body?.platform ?? "all";
  const dryRun: boolean = body?.dryRun ?? false;

  if (!title || !text) {
    return NextResponse.json({ error: "title と body は必須です" }, { status: 400 });
  }

  if (!["all", "ios", "android", "both"].includes(platform)) {
    return NextResponse.json({ error: "platform が不正です" }, { status: 400 });
  }

  if (dryRun) {
    const subscribers = await notificationService.listActiveSubscribers();
    return NextResponse.json({ ok: true, dryRun: true, count: subscribers.length });
  }

  const result = await notificationService.sendNewBatch(
    title,
    text,
    platform as "all" | "ios" | "android" | "both"
  );

  return NextResponse.json({ ok: true, ...result });
}
