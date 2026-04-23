"use server";

import { featureFlagService } from "@/lib/server/services/feature-flag";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { revalidatePath } from "next/cache";

export async function setFeatureFlagAction(key: string, enabled: boolean) {
  try {
    const session = await assertAdminSession();
    await featureFlagService.setEnabled(key, enabled, session.user?.email ?? null);
    revalidatePath("/admin/feature-flags");
    revalidatePath("/ja/ranking");
    revalidatePath("/en/ranking");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "更新に失敗しました",
    };
  }
}
