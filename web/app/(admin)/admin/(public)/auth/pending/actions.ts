"use server";

import { adminRawAuth } from "@/admin-auth";
import { adminUserService } from "@/lib/server/services";
import { redirect } from "next/navigation";

export async function verifyCodeAction(code: string) {
  const session = await adminRawAuth();
  if (!session?.user?.email) {
    return { ok: false as const, error: "セッションが無効です。再度サインインしてください。" };
  }

  const email = session.user.email;

  try {
    await adminUserService.verifyCodeAndActivate(email, code);
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "コードの検証に失敗しました",
    };
  }

  // 承認完了 → 管理画面へ（redirect は try/catch の外で）
  redirect("/admin");
}
