import { adminAuth } from "@/admin-auth";
import { NextResponse } from "next/server";

/**
 * API Route Handler 内で使う管理者チェック。
 * AdminUser テーブルに基づくセッションを検証する（User.role は参照しない）。
 */
export async function requireAdminSession() {
  const session = await adminAuth();
  if (!session) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }
  return { response: null, session };
}

/**
 * Server Action 内で使う管理者チェック。
 * redirect() ではなく Error を throw することで、呼び出し側の try-catch が
 * キャッチして { ok: false, error } を返す。ページ遷移は起きない。
 * ページレベルの保護は (protected)/layout.tsx が担う。
 */
export async function assertAdminSession() {
  const session = await adminAuth();
  if (!session) {
    throw new Error("管理者権限が必要です");
  }
  return session;
}
