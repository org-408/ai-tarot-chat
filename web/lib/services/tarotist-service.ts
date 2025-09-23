import type { Tarotist } from "@/../shared/lib/types";
import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/prisma/prisma";

// ==========================================
// 基本的なユーザー取得・作成・更新
// ==========================================

// デフォルトのタロット占い師情報を取得
export async function getDefaultTarotist(): Promise<Tarotist | null> {
  return await prisma.tarotist.findFirst();
}

// タロット占い師リストを取得
export async function getTarotists(soft: boolean = true): Promise<Tarotist[]> {
  return await prisma.tarotist.findMany({
    where: soft ? { deletedAt: null } : undefined,
    orderBy: { createdAt: "asc" },
  });
}

export async function getTarotistById(
  id: string,
  soft: boolean = true
): Promise<Tarotist | null> {
  return await prisma.tarotist.findFirst({
    where: soft ? { id, deletedAt: null } : { id },
  });
}

// タロティスト情報を作成
export async function createTarotist(
  data: Prisma.TarotistCreateInput
): Promise<Tarotist> {
  return await prisma.tarotist.create({
    data,
  });
}

// タロティスト情報を更新
export async function updateTarotist(
  id: string,
  data: Prisma.TarotistUpdateInput,
  soft: boolean = true
): Promise<Tarotist> {
  return await prisma.tarotist.update({
    where: soft ? { id, deletedAt: null } : { id },
    data,
  });
}

// タロティスト情報を削除
export async function deleteTarotist(
  id: string,
  soft: boolean = true
): Promise<Tarotist> {
  if (soft) {
    // ソフトデリート（論理削除）
    return await prisma.tarotist.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
  // ハードデリート（物理削除）
  return await prisma.tarotist.delete({
    where: { id },
  });
}
