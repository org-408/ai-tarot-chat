import { Resend } from "resend";
import * as repo from "@/lib/server/repositories/notification";

const FROM_EMAIL =
  process.env.NOTIFY_FROM_EMAIL ?? "noreply@ariadne-ai.app";
const BASE_URL = process.env.AUTH_URL ?? "https://ariadne-ai.app";

export type NotificationPlatform = "all" | "ios" | "android" | "both";

function platformLabel(platform: string | null): string {
  if (platform === "ios") return "iOS (App Store)";
  if (platform === "android") return "Android (Google Play)";
  return "iOS・Android 両方";
}

function buildEmailHtml(
  title: string,
  body: string,
  platform: string | null,
  unsubscribeUrl: string
): string {
  const bodyHtml = body
    .split("\n")
    .map((line) => `<p style="color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 8px;">${line}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,0.1);">
    <div style="background:linear-gradient(135deg,#4c1d95,#3730a3);padding:40px 32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">🔮</div>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:bold;">Ariadne</h1>
      <p style="margin:8px 0 0;color:#c4b5fd;font-size:14px;">AI タロット占い</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1e1b4b;font-size:20px;font-weight:bold;margin:0 0 16px;">${title}</h2>
      <p style="color:#6b7280;font-size:12px;margin:0 0 16px;">${platformLabel(platform)} 向け</p>
      <div style="margin-bottom:28px;">${bodyHtml}</div>
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${BASE_URL}/download"
          style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;padding:14px 40px;border-radius:100px;font-size:16px;font-weight:bold;">
          ダウンロードページを見る →
        </a>
      </div>
      <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:0;">
        このメールは、Ariadne のリリース通知にご登録いただいた方にお送りしています。<br>
        心当たりがない場合、このメールは無視してください。
      </p>
    </div>
    <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #f3f4f6;">
      <p style="color:#9ca3af;font-size:12px;margin:0 0 8px;">© ${new Date().getFullYear()} Ariadne</p>
      <a href="${unsubscribeUrl}" style="color:#9ca3af;font-size:11px;">配信停止はこちら</a>
    </div>
  </div>
</body>
</html>`;
}

export class NotificationService {
  private getResendClient() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY が設定されていません");
    return new Resend(apiKey);
  }

  // ==========================================
  // 登録者
  // ==========================================

  async listActiveSubscribers() {
    return repo.listActiveSubscriptions();
  }

  async listAllSubscribers() {
    return repo.listAllSubscriptions();
  }

  // ==========================================
  // バッチ
  // ==========================================

  async listBatches() {
    return repo.listBatches();
  }

  async getBatch(id: string) {
    return repo.findBatch(id);
  }

  async getBatchDetail(id: string) {
    const batch = await repo.findBatch(id);
    if (!batch) return null;
    const sents = await repo.listSentForBatch(id);
    const unsent = await repo.listUnsentSubscriptionsForBatch(id, batch.platform);
    return { batch, sents, unsent };
  }

  async previewUnsent(batchId: string) {
    const batch = await repo.findBatch(batchId);
    if (!batch) throw new Error("バッチが見つかりません");
    return repo.listUnsentSubscriptionsForBatch(batchId, batch.platform);
  }

  // ==========================================
  // 送信
  // ==========================================

  async sendNewBatch(
    title: string,
    body: string,
    platform: NotificationPlatform
  ) {
    const batch = await repo.createBatch({ title, body, platform });
    return this._sendBatch(batch.id);
  }

  async resendUnsent(batchId: string) {
    return this._sendBatch(batchId);
  }

  private async _sendBatch(batchId: string) {
    const batch = await repo.findBatch(batchId);
    if (!batch) throw new Error("バッチが見つかりません");

    const resend = this.getResendClient();
    const targets = await repo.listUnsentSubscriptionsForBatch(
      batchId,
      batch.platform
    );

    if (targets.length === 0) {
      return { batchId, sent: 0, failed: 0, errors: [] as string[] };
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const sub of targets) {
      let token = sub.unsubscribeToken;
      if (!token) {
        const updated = await repo.ensureUnsubscribeToken(sub.id);
        token = updated.unsubscribeToken;
      }
      const unsubscribeUrl = `${BASE_URL}/api/notify/unsubscribe?token=${token}`;

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: sub.email,
          subject: `🔮 ${batch.title}`,
          html: buildEmailHtml(batch.title, batch.body, sub.platform ?? null, unsubscribeUrl),
        });
        await repo.createSentRecord({
          batchId,
          subscriptionId: sub.id,
          email: sub.email,
          status: "success",
        });
        sent++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await repo.createSentRecord({
          batchId,
          subscriptionId: sub.id,
          email: sub.email,
          status: "failed",
          error: msg,
        });
        errors.push(`${sub.email}: ${msg}`);
        failed++;
      }
    }

    await repo.updateBatch(batchId, {
      sentAt: new Date(),
      totalSent: (batch.totalSent ?? 0) + sent,
      totalFailed: (batch.totalFailed ?? 0) + failed,
    });

    return { batchId, sent, failed, errors };
  }
}

export const notificationService = new NotificationService();
