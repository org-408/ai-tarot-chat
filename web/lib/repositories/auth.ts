import { Prisma } from "@prisma/client";
import { BaseRepository } from "./base";

export class AuthRepository extends BaseRepository {
  // ==================== Account ====================
  async getAccountsByUserId(userId: string) {
    return await this.db.account.findMany({
      where: { userId },
    });
  }

  async getAccountByProvider(userId: string, provider: string) {
    return await this.db.account.findFirst({
      where: { userId, provider },
    });
  }

  // ==================== User ====================
  async createUser(data: {
    id: string;
    email: string;
    name?: string;
    image?: string;
  }) {
    return await this.db.user.create({
      data: {
        id: data.id,
        email: data.email,
        name: data.name,
        image: data.image,
      },
    });
  }

  async getUserById(id: string) {
    return await this.db.user.findUnique({
      where: { id },
      include: { client: { include: { plan: true } } },
    });
  }

  async getUserByEmail(email: string) {
    return await this.db.user.findUnique({
      where: { email },
    });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    return await this.db.user.update({
      where: { id },
      data,
    });
  }

  async deleteUser(id: string) {
    return await this.db.user.delete({
      where: { id },
    });
  }

  /**
   * 使用済みticketをチェック
   */
  async findUsedTicket(ticketHash: string) {
    return await this.db.usedTicket.findUnique({
      where: { ticketHash },
    });
  }

  /**
   * ticketを使用済みにマーク
   */
  async markTicketAsUsed(data: {
    ticketHash: string;
    userId: string;
    deviceId?: string;
    expiresAt: Date;
  }) {
    return await this.db.usedTicket.create({
      data: {
        ticketHash: data.ticketHash,
        userId: data.userId,
        deviceId: data.deviceId,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * 期限切れticketをクリーンアップ
   */
  async cleanupExpiredTickets() {
    const result = await this.db.usedTicket.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }

  /**
   * ユーザーのticket使用履歴を取得（監査ログ用）
   */
  async getUserTicketHistory(userId: string, limit = 10) {
    return await this.db.usedTicket.findMany({
      where: { userId },
      orderBy: { usedAt: "desc" },
      take: limit,
    });
  }
}

export const authRepository = new AuthRepository();
