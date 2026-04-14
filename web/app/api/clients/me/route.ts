import { authService } from "@/lib/server/services/auth";
import { clientService } from "@/lib/server/services";
import { logWithContext } from "@/lib/server/logger/logger";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload) return payload.error;

    await clientService.deleteAccount(payload.payload.clientId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logWithContext("error", "Account deletion error", { error });
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
