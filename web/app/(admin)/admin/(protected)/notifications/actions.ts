"use server";

import { notificationService, type NotificationPlatform } from "@/lib/server/services/notification";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";

export async function listBatchesAction() {
  try {
    await assertAdminSession();
    const batches = await notificationService.listBatches();
    return {
      ok: true as const,
      batches: batches.map((b) => ({
        id: b.id,
        title: b.title,
        platform: b.platform,
        sentAt: b.sentAt?.toISOString() ?? null,
        totalSent: b.totalSent,
        totalFailed: b.totalFailed,
        createdAt: b.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "取得に失敗しました",
    };
  }
}

export async function listSubscribersAction() {
  try {
    await assertAdminSession();
    const subscribers = await notificationService.listAllSubscribers();
    return {
      ok: true as const,
      subscribers: subscribers.map((s) => ({
        id: s.id,
        email: s.email,
        platform: s.platform,
        unsubscribedAt: s.unsubscribedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "取得に失敗しました",
    };
  }
}

export async function sendNewBatchAction(
  title: string,
  body: string,
  platform: NotificationPlatform
) {
  try {
    await assertAdminSession();
    const result = await notificationService.sendNewBatch(title, body, platform);
    return { ok: true as const, ...result };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "送信に失敗しました",
    };
  }
}
