"use server";

import { notificationService } from "@/lib/server/services/notification";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";

export async function getBatchDetailAction(batchId: string) {
  await assertAdminSession();
  try {
    const detail = await notificationService.getBatchDetail(batchId);
    if (!detail) return { ok: false as const, error: "バッチが見つかりません" };
    const { batch, sents, unsent } = detail;
    return {
      ok: true as const,
      batch: {
        id: batch.id,
        title: batch.title,
        body: batch.body,
        platform: batch.platform,
        sentAt: batch.sentAt?.toISOString() ?? null,
        totalSent: batch.totalSent,
        totalFailed: batch.totalFailed,
        createdAt: batch.createdAt.toISOString(),
      },
      sents: sents.map((s) => ({
        id: s.id,
        email: s.email,
        status: s.status,
        error: s.error ?? null,
        sentAt: s.sentAt.toISOString(),
      })),
      unsent: unsent.map((s) => ({
        id: s.id,
        email: s.email,
        platform: s.platform,
      })),
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "取得に失敗しました",
    };
  }
}

export async function resendUnsentAction(batchId: string) {
  await assertAdminSession();
  try {
    const result = await notificationService.resendUnsent(batchId);
    return { ok: true as const, ...result };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "送信に失敗しました",
    };
  }
}
