"use server";

import { chatRepository } from "@/lib/server/repositories/chat";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";

export async function fetchReadingMessages(readingId: string) {
  await assertAdminSession();
  const messages = await chatRepository.getMessagesByReadingId(readingId);
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    chatType: m.chatType,
    message: m.message,
    createdAt: m.createdAt,
  }));
}
