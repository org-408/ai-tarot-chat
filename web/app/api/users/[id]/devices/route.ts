import { listUserDevices } from "@/lib/services/user-service";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_: Request, { params }: RouteParams) {
  const { id } = await params;
  const devices = await listUserDevices(id);
  return NextResponse.json(devices);
}
