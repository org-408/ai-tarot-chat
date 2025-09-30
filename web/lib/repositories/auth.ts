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
}

export const authRepository = new AuthRepository();
