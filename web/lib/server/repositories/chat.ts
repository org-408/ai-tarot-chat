import type { ChatMessage } from "@/../shared/lib/types";
import { convertFromPrismaProviderKey } from "../../utils/prisma";
import { BaseRepository } from "./base";

export class ChatRepository extends BaseRepository {
  async createChatMessage(
    message: Omit<
      ChatMessage,
      "id" | "createdAt" | "client" | "device" | "tarotist" | "reading"
    >
  ): Promise<string> {
    const created = await this.db.chatMessage.create({
      data: {
        clientId: message.clientId,
        deviceId: message.deviceId,
        tarotistId: message.tarotistId,
        chatType: message.chatType,
        readingId: message.readingId,
        role: message.role,
        message: message.message,
      },
    });

    return created.id;
  }

  async getMessagesByReadingId(readingId: string): Promise<ChatMessage[]> {
    return (
      await this.db.chatMessage.findMany({
        where: { readingId },
        orderBy: { createdAt: "asc" },
        include: {
          client: true,
          tarotist: true,
        },
      })
    ).map((msg) => {
      const { client, tarotist, ...rest } = msg;
      tarotist.provider = convertFromPrismaProviderKey(tarotist.provider);
      return { ...rest, tarotist, client };
    });
  }

  async getMessagesByClientId(
    clientId: string,
    limit = 100
  ): Promise<ChatMessage[]> {
    return await this.db.chatMessage.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async getMessagesByDeviceId(
    deviceId: string,
    limit = 100
  ): Promise<ChatMessage[]> {
    return await this.db.chatMessage.findMany({
      where: { deviceId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async deleteMessagesByReadingId(readingId: string): Promise<void> {
    await this.db.chatMessage.deleteMany({
      where: { readingId },
    });
  }
}

export const chatRepository = new ChatRepository();
