"use server";

import { prisma } from "@/prisma/prisma";

export async function fetchReadingMessages(readingId: string) {
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
