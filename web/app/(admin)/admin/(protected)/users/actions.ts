"use server";

import { adminUserService } from "@/lib/server/services";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

/** 管理者を削除（AdminUser テーブルから除外） */
export async function removeAdminAction(adminUserId: string) {
  try {
    const session = await assertAdminSession();
    await adminUserService.removeAdmin(adminUserId, session.user?.id ?? "");
    revalidatePath("/admin/users");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "削除に失敗しました" };
  }
}

/** 承認待ち管理者をアクティベート（DB で activatedAt をセット） */
export async function activateAdminAction(adminUserId: string) {
  try {
    await assertAdminSession();
    await adminUserService.activateAdmin(adminUserId);
    revalidatePath("/admin/users");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "承認に失敗しました" };
  }
}

/** 管理者を招待（AdminUser に upsert してコード付き招待メール送信） */
export async function sendInviteEmailAction(email: string) {
  try {
    await assertAdminSession();
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { ok: false as const, error: "RESEND_API_KEY が未設定です" };
    const fromEmail = process.env.NOTIFY_FROM_EMAIL ?? "noreply@ariadne-ai.app";
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "https://ariadne-ai.app";

    // AdminUser に upsert（activatedAt は変更しない）
    await adminUserService.registerAdmin(email);

    // 招待コードを生成して AdminVerificationToken に保存
    const code = await adminUserService.createInviteCode(email);

    revalidatePath("/admin/users");

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "🛡️ Ariadne 管理者への招待",
      html: buildInviteHtml(email, code, baseUrl),
    });

    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "送信に失敗しました" };
  }
}

function buildInviteHtml(email: string, code: string, baseUrl: string): string {
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
      <p style="color:#374151;font-size:14px;line-height:1.7;">管理者への招待が届きました。下のボタンから Google アカウントでサインインし、確認コードを入力してください。</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${baseUrl}/admin/auth/signin"
           style="background:#4c1d95;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
          管理画面へサインイン
        </a>
      </div>
      <div style="background:#f3f4f6;border-radius:8px;padding:16px;text-align:center;margin:16px 0;">
        <p style="color:#6b7280;font-size:12px;margin:0 0 8px;">確認コード（有効期限：15分）</p>
        <p style="color:#1f2937;font-size:32px;font-weight:700;letter-spacing:0.3em;margin:0;">${code}</p>
      </div>
      <p style="color:#9ca3af;font-size:12px;">このメールは ${email} 宛に送信されました。</p>
    </div>
  </div>
</body>
</html>`;
}
