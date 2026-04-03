import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

export async function requireAdminSession() {
  const session = await auth();
  if (!session) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }
  if (session.user.role !== "ADMIN") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      session: null,
    };
  }
  return { response: null, session };
}

export async function assertAdminSession() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/admin/auth/signin");
  }

  return session;
}
