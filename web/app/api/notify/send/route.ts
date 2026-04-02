import { prisma } from "@/lib/server/repositories/database";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL ?? "noreply@ai-tarot.chat";
const ADMIN_SECRET = process.env.ADMIN_API_SECRET;

function buildEmailHtml(platform: string | null): string {
  const platformLabel =
    platform === "ios" ? "iOS (App Store)" :
    platform === "android" ? "Android (Google Play)" :
    "iOS・Android 両方";

  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,0.1);">
    <!-- ヘッダー -->
    <div style="background:linear-gradient(135deg,#4c1d95,#3730a3);padding:40px 32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">🔮</div>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:bold;">AI タロット占い</h1>
      <p style="margin:8px 0 0;color:#c4b5fd;font-size:14px;">アプリがリリースされました</p>
    </div>
    <!-- 本文 -->
    <div style="padding:32px;">
      <p style="color:#1e1b4b;font-size:16px;line-height:1.7;margin:0 0 16px;">
        お待たせしました！<br>
        <strong>${platformLabel}</strong> 向けアプリがリリースされました。
      </p>
      <p style="color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 28px;">
        以前ご登録いただいたリリース通知をお届けします。
        ぜひダウンロードして、AI 占い師たちと占いを楽しんでください。
      </p>
      <!-- CTAボタン -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${process.env.AUTH_URL ?? "https://ai-tarot.chat"}/download"
          style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;padding:14px 40px;border-radius:100px;font-size:16px;font-weight:bold;">
          ダウンロードページを見る →
        </a>
      </div>
      <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:0;">
        このメールは、AI タロット占いのリリース通知にご登録いただいた方にお送りしています。<br>
        心当たりがない場合、このメールは無視してください。
      </p>
    </div>
    <!-- フッター -->
    <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #f3f4f6;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} AI タロット占い</p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  // 管理者シークレットで認証
  const authHeader = req.headers.get("authorization");
  if (!ADMIN_SECRET || authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY が設定されていません" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const platform: string = body?.platform ?? "both"; // 絞り込み用（省略時は全員）
  const dryRun: boolean = body?.dryRun ?? false;

  // 未送信の登録者を取得（platform 絞り込みあり）
  const subscribers = await prisma.emailSubscription.findMany({
    where: {
      notifiedAt: null,
      ...(platform !== "all" ? {
        OR: [
          { platform },
          { platform: "both" },
        ],
      } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  if (subscribers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "送信対象者がいません" });
  }

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, count: subscribers.length, emails: subscribers.map((s) => s.email) });
  }

  // Resend でバッチ送信（1件ずつ。失敗しても続行）
  let sent = 0;
  const errors: string[] = [];

  for (const sub of subscribers) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: sub.email,
        subject: "🔮 AI タロット占いアプリがリリースされました",
        html: buildEmailHtml(sub.platform),
      });
      await prisma.emailSubscription.update({
        where: { id: sub.id },
        data: { notifiedAt: new Date() },
      });
      sent++;
    } catch (e) {
      errors.push(`${sub.email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ ok: true, sent, errors: errors.length > 0 ? errors : undefined });
}
