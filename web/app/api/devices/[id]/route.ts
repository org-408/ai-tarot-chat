// app/api/devices/[deviceId]/route.ts  （解除）
import { unlinkDevice } from "@/lib/services/user-service";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const { id } = await params;
  await unlinkDevice(id);
  return NextResponse.json({ success: true });
}
