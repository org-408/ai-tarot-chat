"use server";

import { clientService } from "@/lib/server/services/client";
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

export async function resetClientUsageAction(input: {
  clientId: string;
  resetType: "READINGS" | "PERSONAL" | "ALL";
  reason?: string;
}) {
  try {
    const session = await assertAdminSession();
    await clientService.adminResetUsage({
      clientId: input.clientId,
      resetType: input.resetType,
      adminEmail: session.user?.email ?? "unknown",
      reason: input.reason,
    });
    revalidatePath(`/admin/clients/${input.clientId}`);
    revalidatePath("/admin/clients");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "リセットに失敗しました",
    };
  }
}
