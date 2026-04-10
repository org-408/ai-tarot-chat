import { upsertSubscription } from "@/lib/server/repositories/notification";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = body?.email ?? "";
  const platform: string = body?.platform ?? "both";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "有効なメールアドレスを入力してください" },
      { status: 400 }
    );
  }

  if (!["ios", "android", "both"].includes(platform)) {
    return NextResponse.json(
      { error: "platform が不正です" },
      { status: 400 }
    );
  }

  try {
    await upsertSubscription(email, platform);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "登録に失敗しました。しばらくしてから再試行してください" },
      { status: 500 }
    );
  }
}
