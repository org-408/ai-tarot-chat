// app/api/users/migrate/route.ts  （ゲスト→登録）
import { migrateGuestUser } from "@/lib/services/user-service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { deviceId, email, name, image } = await req.json();
  const user = await migrateGuestUser({ deviceId, email, name, image });
  return NextResponse.json(user);
}
