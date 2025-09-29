import type { ChatMessage } from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class ChatRepository extends BaseRepository {
  async createChatMessage(
    message: Omit<ChatMessage, "id" | "createdAt">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO chat_messages (
        id, user_id, device_id, tarotist_id, chat_type, reading_id, role, message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        message.clientId,
        message.deviceId,
        message.tarotistId,
        message.chatType,
        message.readingId,
        message.role,
        message.message,
        now,
      ]
    );

    return id;
  }

  async getMessagesByReadingId(readingId: string): Promise<ChatMessage[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM chat_messages WHERE reading_id = ? ORDER BY created_at ASC`,
      [readingId]
    );

    return rows.map((row) => this.mapRowToChatMessage(row));
  }

  async getMessagesByUserId(
    clientId: string,
    limit = 100
  ): Promise<ChatMessage[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [clientId, limit]
    );

    return rows.map((row) => this.mapRowToChatMessage(row));
  }

  async getMessagesByDeviceId(
    deviceId: string,
    limit = 100
  ): Promise<ChatMessage[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM chat_messages WHERE device_id = ? ORDER BY created_at DESC LIMIT ?`,
      [deviceId, limit]
    );

    return rows.map((row) => this.mapRowToChatMessage(row));
  }

  async deleteMessagesByReadingId(readingId: string): Promise<void> {
    await this.db.execute(`DELETE FROM chat_messages WHERE reading_id = ?`, [
      readingId,
    ]);
  }

  private mapRowToChatMessage(row: any): ChatMessage {
    return {
      id: row.id,
      clientId: row.user_id,
      deviceId: row.device_id,
      tarotistId: row.tarotist_id,
      chatType: row.chat_type,
      readingId: row.reading_id,
      role: row.role,
      message: row.message,
      createdAt: this.fromTimestamp(row.created_at),
    };
  }
}

export const chatRepository = new ChatRepository();
