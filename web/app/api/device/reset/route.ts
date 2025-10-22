import { logWithContext } from "@/lib/server/logger/logger";
import { authService } from "@/lib/server/services/auth";
import { clientService } from "@/lib/server/services/client";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const payload = await authService.verifyApiRequest(request);

    logWithContext("info", "Device reset requested", { payload });
    if ("error" in payload || !payload)
      return new Response("unauthorized", { status: 401 });

    // payloadの検証
    if (payload.payload.t !== "app" || !payload.payload.deviceId)
      return new Response("forbidden", { status: 403 });

    const deviceId = payload.payload.deviceId;

    await clientService.deleteClientByDeviceId(deviceId);

    logWithContext("info", "Device reset completed", { deviceId });

    return Response.json({
      success: true,
    });
  } catch (error) {
    logWithContext("error", "Device reset error", { error, status: 500 });
    return Response.json({ error: "Reset failed" }, { status: 500 });
  }
}
