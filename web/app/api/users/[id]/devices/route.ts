import { listUserDevices } from "@/lib/services/user-service";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const devices = await listUserDevices(params.id);
  return NextResponse.json(devices);
}
