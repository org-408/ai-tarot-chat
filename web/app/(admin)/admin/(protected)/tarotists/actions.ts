"use server";

import type { TarotistInput } from "@/../shared/lib/types";
import { tarotistService } from "@/lib/server/services/tarotist";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { revalidatePath } from "next/cache";

type TarotistActionInput = Omit<Partial<TarotistInput>, "provider"> & {
  provider?: TarotistInput["provider"];
};

function toTarotistInput(input: TarotistActionInput): TarotistInput {
  return {
    no: Number(input.no ?? 1),
    name: input.name ?? "",
    title: input.title ?? "",
    icon: input.icon ?? "🔮",
    trait: input.trait ?? "",
    bio: input.bio ?? "",
    primaryColor: input.primaryColor ?? "#4F46E5",
    secondaryColor: input.secondaryColor ?? "#7C3AED",
    accentColor: input.accentColor ?? "#EC4899",
    avatarUrl: input.avatarUrl ?? null,
    provider: input.provider ?? "CLAUDE_S",
    model: input.model ?? null,
    cost: input.cost ?? null,
    quality: input.quality == null ? null : Number(input.quality),
    planId: input.planId ?? "",
    deletedAt: input.deletedAt ?? null,
  };
}

function revalidateTarotistPages() {
  revalidatePath("/admin/tarotists");
  revalidatePath("/admin");
}

export async function createTarotistAction(input: TarotistActionInput) {
  try {
    await assertAdminSession();
    await tarotistService.createTarotist(toTarotistInput(input));
    revalidateTarotistPages();
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "タロティスト作成に失敗しました",
    };
  }
}

export async function updateTarotistAction(id: string, input: TarotistActionInput) {
  try {
    await assertAdminSession();
    await tarotistService.updateTarotist(id, toTarotistInput(input), false);
    revalidateTarotistPages();
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "タロティスト更新に失敗しました",
    };
  }
}

export async function deleteTarotistAction(id: string) {
  try {
    await assertAdminSession();
    await tarotistService.deleteTarotist(id, true);
    revalidateTarotistPages();
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "タロティスト削除に失敗しました",
    };
  }
}

export async function restoreTarotistAction(id: string) {
  try {
    await assertAdminSession();
    await tarotistService.restoreTarotist(id);
    revalidateTarotistPages();
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "タロティスト復元に失敗しました",
    };
  }
}
