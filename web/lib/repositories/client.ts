import type { Client, Device } from "@/../shared/lib/types";
import { Prisma } from "@prisma/client";
import { BaseRepository } from "./base";

export class ClientRepository extends BaseRepository {
  // ==================== Client ====================
  async createClient(data: Prisma.ClientCreateInput): Promise<Client> {
    return (await this.db.client.create({
      data,
      include: { plan: true, user: true },
    })) as Client;
  }

  async getClientById(id: string): Promise<Client | null> {
    return (await this.db.client.findUnique({
      where: { id, deletedAt: null },
      include: {
        plan: true,
        user: true,
      },
    })) as Client | null;
  }

  async getClientWithAllRelations(id: string): Promise<Client | null> {
    return (await this.db.client.findUnique({
      where: { id, deletedAt: null },
      include: {
        plan: true,
        user: true,
        devices: true,
        favoriteSpreads: true,
        readings: true,
        planChangeHistories: true,
        chatMessages: true,
      },
    })) as Client | null;
  }

  async getClientByEmail(email: string): Promise<Client | null> {
    return (await this.db.client.findUnique({
      where: { email, deletedAt: null },
      include: {
        plan: true,
        user: true,
      },
    })) as Client | null;
  }

  async getClientByUserId(userId: string): Promise<Client | null> {
    return (await this.db.client.findUnique({
      where: { userId, deletedAt: null },
      include: {
        plan: true,
        user: true,
      },
    })) as Client | null;
  }

  async updateClient(
    id: string,
    data: Prisma.ClientUncheckedUpdateInput
  ): Promise<Client> {
    return (await this.db.client.update({
      where: { id },
      data,
      include: { plan: true, user: true },
    })) as Client;
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
  async createDevice(data: Prisma.DeviceCreateInput): Promise<Device> {
    return await this.db.device.create({
      data,
      include: { client: { include: { plan: true } } },
    });
  }

  async getDeviceById(id: string): Promise<Device | null> {
    return await this.db.device.findUnique({
      where: { id },
      include: { client: { include: { plan: true } } },
    });
  }

  async getDeviceByDeviceId(deviceId: string): Promise<Device | null> {
    return await this.db.device.findUnique({
      where: { deviceId },
      include: { client: { include: { plan: true } } },
    });
  }

  async getDevicesByClientId(clientId: string): Promise<Device[]> {
    return await this.db.device.findMany({
      where: { clientId },
      include: { client: { include: { plan: true } } },
      orderBy: { lastSeenAt: "desc" },
    });
  }

  async updateDevice(
    id: string,
    data: Prisma.DeviceUncheckedUpdateInput
  ): Promise<Device> {
    return await this.db.device.update({
      where: { id },
      data,
      include: { client: { include: { plan: true } } },
    });
  }

  async deleteDevice(id: string): Promise<void> {
    await this.db.device.delete({
      where: { id },
    });
  }
}

export const clientRepository = new ClientRepository();
