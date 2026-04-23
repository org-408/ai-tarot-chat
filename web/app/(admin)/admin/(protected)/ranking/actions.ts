"use server";

import { RankingKind } from "@/lib/generated/prisma/client";
import { rankingService } from "@/lib/server/services/ranking";
import { rankingConfigService } from "@/lib/server/services/ranking-config";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/admin/ranking");
  revalidatePath("/ja/ranking");
  revalidatePath("/en/ranking");
}

// -------- 設定トグル --------

export async function setCollectionEnabledAction(enabled: boolean) {
  try {
    const session = await assertAdminSession();
    await rankingConfigService.setCollectionEnabled(
      enabled,
      session.user?.email ?? null
    );
    revalidateAll();
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "更新に失敗しました",
    };
  }
}

export async function setPublicEnabledAction(enabled: boolean) {
  try {
    const session = await assertAdminSession();
    await rankingConfigService.setPublicEnabled(
      enabled,
      session.user?.email ?? null
    );
    revalidateAll();
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "更新に失敗しました",
    };
  }
}

// -------- 期間オペ --------

export async function refreshLatestBucketAction() {
  try {
    await assertAdminSession();
    const result = await rankingService.aggregateBucket();
    revalidateAll();
    return { ok: true as const, result };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "集計に失敗しました",
    };
  }
}

export async function refreshPeriodAction(input: { from: string; to: string }) {
  try {
    await assertAdminSession();
    const from = new Date(input.from);
    const to = new Date(input.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
      return { ok: false as const, error: "期間指定が不正です" };
    }
    const processed = await rankingService.refreshBuckets(from, to);
    revalidateAll();
    return { ok: true as const, processed };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "再収集に失敗しました",
    };
  }
}

export async function deletePeriodAction(input: {
  from: string;
  to: string;
  kind?: RankingKind;
}) {
  try {
    await assertAdminSession();
    const from = new Date(input.from);
    const to = new Date(input.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
      return { ok: false as const, error: "期間指定が不正です" };
    }
    const result = await rankingService.deleteBuckets(from, to, input.kind);
    revalidateAll();
    return { ok: true as const, deleted: result.count };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "削除に失敗しました",
    };
  }
}

export async function backfillAction(input: { from: string; to: string }) {
  try {
    await assertAdminSession();
    const from = new Date(input.from);
    const to = new Date(input.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
      return { ok: false as const, error: "期間指定が不正です" };
    }
    const result = await rankingService.backfill(from, to);
    revalidateAll();
    return { ok: true as const, ...result };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "バックフィルに失敗しました",
    };
  }
}

export async function resetKindAction(kind: RankingKind) {
  try {
    await assertAdminSession();
    const result = await rankingService.resetKind(kind);
    revalidateAll();
    return { ok: true as const, deleted: result.count };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "リセットに失敗しました",
    };
  }
}

// -------- Override --------

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
    revalidateAll();
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
    revalidateAll();
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "削除に失敗しました",
    };
  }
}
