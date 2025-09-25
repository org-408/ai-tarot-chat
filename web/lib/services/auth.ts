import type { Device, User } from "@/../shared/lib/types";
import { prisma } from "@/lib/repositories/database";
import { planRepository } from "@/lib/repositories/plan";
import { userRepository } from "@/lib/repositories/user";

export class AuthService {
  /**
   * デバイス連携（初回起動時）
   */
  async linkDevice(
    deviceId: string,
    userId?: string
  ): Promise<{
    user: User;
    device: Device;
  }> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return await prisma.$transaction(async (tx) => {
      let user: User;

      if (userId) {
        // 既存ユーザー
        const existing = await userRepository.getUserById(userId);
        if (!existing) throw new Error("User not found");
        user = existing;
      } else {
        // 新規ユーザー（未登録）
        const freePlan = await planRepository.getPlanByCode("free");
        if (!freePlan) throw new Error("Free plan not found");

        const userId = await userRepository.createUser({
          planId: freePlan.id,
          isRegistered: false,
          dailyReadingsCount: 0,
          dailyCelticsCount: 0,
          dailyPersonalCount: 0,
        });

        const created = await userRepository.getUserById(userId);
        if (!created) throw new Error("Failed to create user");
        user = created;
      }

      // デバイス登録
      const existingDevice = await userRepository.getDeviceByDeviceId(deviceId);
      if (existingDevice) {
        // 既存デバイスの更新
        await userRepository.updateDevice(existingDevice.id, {
          userId: user.id,
          lastSeenAt: new Date(),
        });
        return { user, device: existingDevice };
      } else {
        // 新規デバイス登録
        const deviceDbId = await userRepository.createDevice({
          deviceId,
          userId: user.id,
          lastSeenAt: new Date(),
        });

        const device = await userRepository.getDeviceById(deviceDbId);
        if (!device) throw new Error("Failed to create device");

        return { user, device };
      }
    });
  }

  /**
   * ユーザー登録（メールアドレス登録）
   */
  async registerUser(params: {
    deviceId: string;
    email: string;
    name?: string;
  }): Promise<User> {
    const device = await userRepository.getDeviceByDeviceId(params.deviceId);
    if (!device || !device.userId)
      throw new Error("Device or userId not found");

    const user = await userRepository.getUserById(device.userId);
    if (!user) throw new Error("User not found");

    if (user.isRegistered) {
      throw new Error("User already registered");
    }

    await userRepository.updateUser(user.id, {
      email: params.email,
      name: params.name,
      isRegistered: true,
      lastLoginAt: new Date(),
    });

    const updated = await userRepository.getUserById(user.id);
    if (!updated) throw new Error("Failed to update user");

    return updated;
  }
}

export const authService = new AuthService();
