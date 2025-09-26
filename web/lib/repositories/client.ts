import type { Client, Device } from "@/../shared/lib/types";
import { Prisma } from "@prisma/client";
import { BaseRepository } from "./base";

export class ClientRepository extends BaseRepository {
  // ==================== Client ====================
  async createClient(
    client: Omit<Client, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const created = await this.db.client.create({
      data: {
        name: client.name,
        userId: client.userId,
        deletedAt: client.deletedAt,
        planId: client.planId,
        dailyReadingsCount: client.dailyReadingsCount,
        lastReadingDate: client.lastReadingDate,
        dailyCelticsCount: client.dailyCelticsCount,
        lastCelticReadingDate: client.lastCelticReadingDate,
        dailyPersonalCount: client.dailyPersonalCount,
        lastPersonalReadingDate: client.lastPersonalReadingDate,
        isRegistered: client.isRegistered,
        lastLoginAt: client.lastLoginAt,
      },
    });

    return created.id;
  }

  async getClientById(id: string): Promise<Client | null> {
    return await this.db.client.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async getClientByEmail(email: string): Promise<Client | null> {
    return await this.db.client.findUnique({
      where: { email, deletedAt: null },
    });
  }

  async updateClient(
    id: string,
    updates: Prisma.ClientUncheckedUpdateInput
  ): Promise<void> {
    await this.db.client.update({
      where: { id },
      data: updates,
    });
  }

  async softDeleteClient(id: string): Promise<void> {
    await this.db.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async hardDeleteClient(id: string): Promise<void> {
    await this.db.client.delete({
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
        clientId: device.clientId,
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

  async getDevicesByClientId(clientId: string): Promise<Device[]> {
    return await this.db.device.findMany({
      where: { clientId },
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

export const clientRepository = new ClientRepository();
