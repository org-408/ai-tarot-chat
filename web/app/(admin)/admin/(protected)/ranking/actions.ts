"use server";

import { RankingKind } from "@/lib/generated/prisma/client";
import { rankingService } from "@/lib/server/services/ranking";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { revalidatePath } from "next/cache";

export async function refreshRankingAction() {
  try {
    await assertAdminSession();
    const result = await rankingService.refreshAllSnapshots();
    revalidatePath("/admin/ranking");
    revalidatePath("/ja/ranking");
    revalidatePath("/en/ranking");
    return { ok: true as const, result };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "再集計に失敗しました",
    };
  }
}

export async function upsertRankingOverrideAction(input: {
  kind: RankingKind;
  targetId: string;
  rank: number;
  isActive: boolean;
  note?: string | null;
}) {
  try {
    const session = await assertAdminSession();
    await rankingService.upsertOverride({
      ...input,
      updatedBy: session.user?.email ?? null,
    });
    revalidatePath("/admin/ranking");
    revalidatePath("/ja/ranking");
    revalidatePath("/en/ranking");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "保存に失敗しました",
    };
  }
}

export async function deleteRankingOverrideAction(id: string) {
  try {
    await assertAdminSession();
    await rankingService.deleteOverride(id);
    revalidatePath("/admin/ranking");
    revalidatePath("/ja/ranking");
    revalidatePath("/en/ranking");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "削除に失敗しました",
    };
  }
}
