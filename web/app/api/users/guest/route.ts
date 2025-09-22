// app/api/users/guest/route.ts  （ゲスト作成）
import { createGuestUser } from "@/lib/services/user-service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { deviceId, platform, appVersion, osVersion } = await req.json();
  const user = await createGuestUser({
    deviceId,
    platform,
    appVersion,
    osVersion,
  });
  return NextResponse.json(user);
}
