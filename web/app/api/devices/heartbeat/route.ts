import { heartbeatDevice } from "@/lib/services/user-service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { deviceId, appVersion, osVersion, pushToken } = await req.json();
  const d = await heartbeatDevice(deviceId, {
    appVersion,
    osVersion,
    pushToken,
  });
  return NextResponse.json(d);
}
