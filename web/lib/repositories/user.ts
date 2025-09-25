import type { Device, User } from "@/../../shared/lib/types";
import { Prisma } from "@prisma/client";
import { BaseRepository } from "./base";

export class UserRepository extends BaseRepository {
  // ==================== User ====================
  async createUser(
    user: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const created = await this.db.user.create({
      data: {
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        deletedAt: user.deletedAt,
        planId: user.planId,
        dailyReadingsCount: user.dailyReadingsCount,
        lastReadingDate: user.lastReadingDate,
        dailyCelticsCount: user.dailyCelticsCount,
        lastCelticReadingDate: user.lastCelticReadingDate,
        dailyPersonalCount: user.dailyPersonalCount,
        lastPersonalReadingDate: user.lastPersonalReadingDate,
        isRegistered: user.isRegistered,
        lastLoginAt: user.lastLoginAt,
      },
    });

    return created.id;
  }

  async getUserById(id: string): Promise<User | null> {
    return await this.db.user.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.db.user.findUnique({
      where: { email, deletedAt: null },
    });
  }

  async updateUser(
    id: string,
    updates: Prisma.UserUncheckedUpdateInput
  ): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: updates,
    });
  }

  async softDeleteUser(id: string): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async hardDeleteUser(id: string): Promise<void> {
    await this.db.user.delete({
      where: { id },
    });
  }

  // ==================== Device ====================
  async createDevice(
    device: Omit<
      Device,
      "id" | "createdAt" | "updatedAt" | "readings" | "chatMessages"
    >
  ): Promise<string> {
    const created = await this.db.device.create({
      data: {
        deviceId: device.deviceId,
        userId: device.userId,
        platform: device.platform,
        appVersion: device.appVersion,
        osVersion: device.osVersion,
        pushToken: device.pushToken,
        lastSeenAt: device.lastSeenAt,
      },
    });

    return created.id;
  }

  async getDeviceById(id: string): Promise<Device | null> {
    return await this.db.device.findUnique({
      where: { id },
    });
  }

  async getDeviceByDeviceId(deviceId: string): Promise<Device | null> {
    return await this.db.device.findUnique({
      where: { deviceId },
    });
  }

  async getDevicesByUserId(userId: string): Promise<Device[]> {
    return await this.db.device.findMany({
      where: { userId },
      orderBy: { lastSeenAt: "desc" },
    });
  }

  async updateDevice(
    id: string,
    updates: Prisma.DeviceUncheckedUpdateInput
  ): Promise<void> {
    await this.db.device.update({
      where: { id },
      data: updates,
    });
  }

  async deleteDevice(id: string): Promise<void> {
    await this.db.device.delete({
      where: { id },
    });
  }
}

export const userRepository = new UserRepository();
