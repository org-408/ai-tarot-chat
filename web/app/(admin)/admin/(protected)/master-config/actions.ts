"use server";

import { masterConfigRepository } from "@/lib/server/repositories";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { revalidatePath } from "next/cache";

/**
 * MasterConfig.MASTER_VERSION を bump する。
 *
 * モバイルクライアントは起動時 (およびフォアグラウンド復帰時) に
 * `/api/masters/check-update` で現在の MASTER_VERSION と自分のキャッシュを
 * 比較している。ここで新しい行を INSERT すると、次回チェックで差分が検知され
 * `/api/masters` から最新マスターデータ (i18n.en 等含む) を再取得する。
 */
export async function bumpMasterVersionAction(note?: string) {
  try {
    const session = await assertAdminSession();
    const actor = session.user?.email ?? "admin";

    const version = new Date().toISOString().replace(/[:.]/g, "-");
    const description = note?.trim()
      ? `${note.trim()} (by ${actor})`
      : `Bumped by ${actor}`;

    await masterConfigRepository.createMasterConfig({
      key: "MASTER_VERSION",
      version,
      description,
    });

    revalidatePath("/admin/master-config");
    return { ok: true as const, version };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "バージョンの更新に失敗しました",
    };
  }
}
