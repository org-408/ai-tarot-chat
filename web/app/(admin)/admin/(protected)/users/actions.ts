"use server";

import { adminAuth } from "@/admin-auth";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

/** 管理者を削除（AdminUser テーブルから除外） */
export async function removeAdminAction(adminUserId: string) {
  try {
    await assertAdminSession();
    // 自分自身は削除不可
    const session = await adminAuth();
    if (session?.user?.id === adminUserId) {
      return { ok: false as const, error: "自分自身の管理者権限は削除できません" };
    }
    await prisma.adminUser.delete({ where: { id: adminUserId } });
    revalidatePath("/admin/users");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "削除に失敗しました" };
  }
}

/** 管理者を招待（AdminUser に upsert して招待メール送信） */
export async function sendInviteEmailAction(email: string) {
  try {
    await assertAdminSession();
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { ok: false as const, error: "RESEND_API_KEY が未設定です" };
    const fromEmail = process.env.NOTIFY_FROM_EMAIL ?? "noreply@ariadne-ai.app";
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "https://ariadne-ai.app";

    // AdminUser テーブルに upsert（既存なら何もしない、新規なら作成）
    await prisma.adminUser.upsert({
      where: { email },
      update: {},
      create: { email },
    });
    revalidatePath("/admin/users");

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "🛡️ Ariadne 管理者への招待",
      html: buildInviteHtml(email, baseUrl),
    });

    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "送信に失敗しました" };
  }
}

function buildInviteHtml(email: string, baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:32px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#4c1d95,#3730a3);padding:32px;text-align:center;">
      <div style="font-size:32px;">🛡️</div>
      <h1 style="color:#fff;margin:8px 0 0;font-size:20px;">Ariadne 管理者招待</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:14px;line-height:1.7;">管理者への招待が届きました。下のボタンから Google アカウントでサインインすると管理画面を利用できます。</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${baseUrl}/admin/auth/signin"
           style="background:#4c1d95;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
          管理画面へサインイン
        </a>
      </div>
      <p style="color:#9ca3af;font-size:12px;">このメールは ${email} 宛に送信されました。</p>
    </div>
  </div>
</body>
</html>`;
}
