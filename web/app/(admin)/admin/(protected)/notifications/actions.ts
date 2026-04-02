"use server";

import { notificationService, type NotificationPlatform } from "@/lib/server/services/notification";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";

export async function previewNotificationTargetsAction(platform: NotificationPlatform) {
  await assertAdminSession();

  try {
    const subscribers = await notificationService.listPendingSubscribers(platform);
    return {
      ok: true as const,
      subscribers: subscribers.map((subscriber) => ({
        id: subscriber.id,
        email: subscriber.email,
        platform: subscriber.platform,
        notifiedAt: subscriber.notifiedAt?.toISOString() ?? null,
        createdAt: subscriber.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "登録者の取得に失敗しました",
    };
  }
}

export async function sendNotificationsAction(platform: NotificationPlatform) {
  await assertAdminSession();

  try {
    const result = await notificationService.sendReleaseNotifications(platform);
    return { ok: true as const, ...result };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "メール送信に失敗しました",
    };
  }
}
