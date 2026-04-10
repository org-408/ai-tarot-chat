"use server";

import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { prisma } from "@/prisma/prisma";

export async function fetchReadingMessages(readingId: string) {
  await assertAdminSession();
  return prisma.chatMessage.findMany({
    where: { readingId },
    select: {
      id: true,
      role: true,
      chatType: true,
      message: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}
