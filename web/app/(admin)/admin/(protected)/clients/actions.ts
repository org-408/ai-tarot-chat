"use server";

import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

export async function changeClientPlanAction(input: {
  clientId: string;
  planId: string;
}) {
  try {
    await assertAdminSession();
    await prisma.client.update({
      where: { id: input.clientId },
      data: { planId: input.planId },
    });
    revalidatePath("/admin/clients");
    revalidatePath("/admin");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "プラン更新に失敗しました",
    };
  }
}
