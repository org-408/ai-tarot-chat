import { upsertDeviceForUser } from "@/lib/services/user-service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { userId, deviceId, platform, appVersion, osVersion, pushToken } = body;
  const d = await upsertDeviceForUser({
    userId,
    deviceId,
    platform,
    appVersion,
    osVersion,
    pushToken,
  });
  return NextResponse.json(d);
}
