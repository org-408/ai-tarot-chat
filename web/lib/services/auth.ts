import type { Client, Device } from "@/../shared/lib/types";
import { clientRepository } from "@/lib/repositories/client";
import { prisma } from "@/lib/repositories/database";
import { planRepository } from "@/lib/repositories/plan";

export class AuthService {
  /**
   * デバイス連携（初回起動時）
   */
  async linkDevice(
    deviceId: string,
    clientId?: string
  ): Promise<{
    client: Client;
    device: Device;
  }> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return await prisma.$transaction(async (tx) => {
      let client: Client;

      if (clientId) {
        // 既存ユーザー
        const existing = await clientRepository.getClientById(clientId);
        if (!existing) throw new Error("Client not found");
        client = existing;
      } else {
        // 新規ユーザー（未登録）
        const freePlan = await planRepository.getPlanByCode("free");
        if (!freePlan) throw new Error("Free plan not found");

        const clientId = await clientRepository.createClient({
          planId: freePlan.id,
          isRegistered: false,
          dailyReadingsCount: 0,
          dailyCelticsCount: 0,
          dailyPersonalCount: 0,
        });

        const created = await clientRepository.getClientById(clientId);
        if (!created) throw new Error("Failed to create client");
        client = created;
      }

      // デバイス登録
      const existingDevice = await clientRepository.getDeviceByDeviceId(
        deviceId
      );
      if (existingDevice) {
        // 既存デバイスの更新
        await clientRepository.updateDevice(existingDevice.id, {
          clientId: client.id,
          lastSeenAt: new Date(),
        });
        return { client, device: existingDevice };
      } else {
        // 新規デバイス登録
        const deviceDbId = await clientRepository.createDevice({
          deviceId,
          clientId: client.id,
          lastSeenAt: new Date(),
        });

        const device = await clientRepository.getDeviceById(deviceDbId);
        if (!device) throw new Error("Failed to create device");

        return { client, device };
      }
    });
  }

  /**
   * ユーザー登録（メールアドレス登録）
   */
  async registerClient(params: {
    deviceId: string;
    email: string;
    name?: string;
  }): Promise<Client> {
    const device = await clientRepository.getDeviceByDeviceId(params.deviceId);
    if (!device || !device.clientId)
      throw new Error("Device or clientId not found");

    const client = await clientRepository.getClientById(device.clientId);
    if (!client) throw new Error("Client not found");

    if (client.isRegistered) {
      throw new Error("Client already registered");
    }

    await clientRepository.updateClient(client.id, {
      email: params.email,
      name: params.name,
      isRegistered: true,
      lastLoginAt: new Date(),
    });

    const updated = await clientRepository.getClientById(client.id);
    if (!updated) throw new Error("Failed to update client");

    return updated;
  }
}

export const authService = new AuthService();
