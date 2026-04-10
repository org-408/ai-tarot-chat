"use server";

import type { SpreadInput } from "@/../shared/lib/types";
import { spreadService } from "@/lib/server/services/spread";
import { revalidatePath } from "next/cache";

function revalidateSpreadPages() {
  revalidatePath("/admin/spreads");
}

export async function createSpreadAction(input: SpreadInput) {
  try {
    const spread = await spreadService.createSpread(input);
    revalidateSpreadPages();
    return { ok: true as const, spread };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "スプレッド作成に失敗しました",
    };
  }
}

export async function updateSpreadAction(id: string, input: SpreadInput) {
  try {
    const spread = await spreadService.updateSpreadById(id, input);
    revalidateSpreadPages();
    return { ok: true as const, spread };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "スプレッド更新に失敗しました",
    };
  }
}

export async function deleteSpreadAction(id: string) {
  try {
    await spreadService.deleteSpreadById(id);
    revalidateSpreadPages();
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "スプレッド削除に失敗しました",
    };
  }
}
