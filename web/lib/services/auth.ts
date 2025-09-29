import type { Client, Device } from "@/../shared/lib/types";
import { auth } from "@/auth";
import { authRepository } from "@/lib/repositories/auth";
import { clientRepository } from "@/lib/repositories/client";
import { prisma } from "@/lib/repositories/database";
import { planRepository } from "@/lib/repositories/plan";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const ALG = "HS256";
const JWT_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET!);
const APP_JWT_TTL = process.env.APP_JWT_TTL ?? "12h";

interface JWTPayload {
  t: string; // "app"
  deviceId: string;
  clientId: string;
  userId?: string;
  planCode: string;
}

interface TicketData {
  t: string; // "ticket"
  sub: string; // userId
  email: string;
  name?: string;
  image?: string;
  provider?: string;
}

export class AuthService {
  // 「厳密ログイン判定」：User.id があり、かつ Account が1件以上ある
  async isStrictlyAuthenticated() {
    const session = await auth();
    const uid = session?.user?.id;
    if (!uid) return false;

    // まれに Cookie はあるが Account が切れているケースを除外
    const accounts = await authRepository.getAccountsByUserId(uid);
    return Boolean(accounts.length > 0);
  }

  /**
   * デバイス登録・再登録（Tauri起動時）
   */
  async registerOrUpdateDevice(params: {
    deviceId: string;
    platform?: string;
    appVersion?: string;
    osVersion?: string;
    pushToken?: string;
  }): Promise<{
    client: Client;
    device: Device;
    token: string;
  }> {
    return await prisma.$transaction(async (tx) => {
      // トランザクション付きRepositoryインスタンス作成
      const clientRepo = clientRepository.withTransaction(tx);
      const planRepo = planRepository.withTransaction(tx);

      // 既存デバイスを確認
      let device = await clientRepo.getDeviceByDeviceId(params.deviceId);
      let client: Client;

      if (device && device.clientId) {
        // 既存デバイス - クライアント情報を取得
        const existingClient = await clientRepo.getClientById(device.clientId);
        if (!existingClient) {
          throw new Error("Client not found for existing device");
        }
        client = existingClient;

        // デバイス情報を更新
        await clientRepo.updateDevice(device.id, {
          platform: params.platform,
          appVersion: params.appVersion,
          osVersion: params.osVersion,
          pushToken: params.pushToken,
          lastSeenAt: new Date(),
        });

        device = await clientRepo.getDeviceById(device.id);
        if (!device) throw new Error("Failed to update device");
      } else {
        // 新規デバイス - 新規クライアント作成
        const freePlan = await planRepo.getPlanByCode("FREE");
        if (!freePlan) throw new Error("Free plan not found");

        const clientId = await clientRepo.createClient({
          planId: freePlan.id,
          isRegistered: false,
          dailyReadingsCount: 0,
          dailyCelticsCount: 0,
          dailyPersonalCount: 0,
        });

        const newClient = await clientRepo.getClientById(clientId);
        if (!newClient) throw new Error("Failed to create client");
        client = newClient;

        // デバイス作成
        const deviceDbId = await clientRepo.createDevice({
          deviceId: params.deviceId,
          clientId: client.id,
          platform: params.platform,
          appVersion: params.appVersion,
          osVersion: params.osVersion,
          pushToken: params.pushToken,
          lastSeenAt: new Date(),
        });

        device = await clientRepo.getDeviceById(deviceDbId);
        if (!device) throw new Error("Failed to create device");
      }

      // クライアント情報を再取得（プラン情報含む）
      const clientWithPlan = await clientRepo.getClientWithPlan(client.id);
      if (!clientWithPlan || !clientWithPlan.plan)
        throw new Error("Failed to get client with plan");

      // アプリ用JWT生成
      const token = await this.generateAppJWT({
        t: "app",
        deviceId: device.deviceId,
        clientId: client.id,
        userId: client.userId || undefined,
        planCode: clientWithPlan.plan.code,
      });

      return { client: clientWithPlan, device, token };
    });
  }

  /**
   * チケット生成（Web認証後）
   */
  async generateTicket(): Promise<string> {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      throw new Error("Not authenticated");
    }

    console.log(`✅ チケット発行成功 (userId: ${session.user.id})`);

    // 30秒間有効なチケットを発行（既存パターンに合わせて）
    return await new SignJWT({
      t: "ticket",
      sub: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      provider: session.provider,
    })
      .setProtectedHeader({ alg: ALG })
      .setIssuedAt()
      .setExpirationTime("30s")
      .sign(JWT_SECRET);
  }

  /**
   * チケット交換＋ユーザー紐付け
   */
  async exchangeTicket(params: { ticket: string; deviceId: string }): Promise<{
    client: Client;
    token: string;
  }> {
    // チケット検証（既存パターンに合わせて）
    let ticketData: TicketData;
    try {
      const { payload } = await jwtVerify(params.ticket, JWT_SECRET, {
        algorithms: [ALG],
      });

      if (payload.t !== "ticket" || !payload.sub) {
        throw new Error("Invalid ticket type");
      }

      ticketData = payload as unknown as TicketData;
    } catch (error) {
      console.error("❌ チケット検証失敗:", error);
      throw new Error("Invalid ticket");
    }

    return await prisma.$transaction(async (tx) => {
      // デバイス取得
      const device = await clientRepository
        .withTransaction(tx)
        .getDeviceByDeviceId(params.deviceId);
      if (!device || !device.clientId) {
        throw new Error("Device not found. Please register device first.");
      }

      // ユーザー情報を取得または作成
      let user = await authRepository
        .withTransaction(tx)
        .getUserByEmail(ticketData.email);

      if (!user) {
        user = await authRepository.withTransaction(tx).createUser({
          id: ticketData.sub, // subからユーザーIDを取得
          email: ticketData.email,
          name: ticketData.name,
          image: ticketData.image,
        });
      } else {
        // 既存ユーザーの情報を更新
        await authRepository.withTransaction(tx).updateUser(user.id, {
          name: ticketData.name || user.name,
          image: ticketData.image || user.image,
        });
        user = await authRepository.withTransaction(tx).getUserById(user.id);
        if (!user) throw new Error("Failed to update user");
      }

      // **重要：既存ユーザーの場合、既存Clientがあるかチェック**
      const existingClient = await prisma.client.findFirst({
        where: {
          userId: user.id,
          deletedAt: null,
        },
        include: {
          plan: true,
          user: true,
        },
      });

      let finalClient: Client;

      if (existingClient) {
        // 既存Clientがある場合：デバイスをそのClientに移動
        await clientRepository.updateDevice(device.id, {
          clientId: existingClient.id,
        });

        // 現在のClientが他にデバイスを持っていない場合は削除
        const currentClient = await clientRepository.getClientById(
          device.clientId
        );
        if (currentClient) {
          const otherDevices = await clientRepository.getDevicesByClientId(
            currentClient.id
          );
          if (otherDevices.length <= 1) {
            // 移動するデバイス以外にない場合
            await clientRepository.softDeleteClient(currentClient.id);
          }
        }

        finalClient = existingClient as Client;

        console.log(
          `✅ 既存Clientに統合 (userId: ${user.id}, clientId: ${existingClient.id})`
        );
      } else {
        // 既存Clientがない場合：現在のClientにユーザー情報を紐付け
        const currentClient = await clientRepository.getClientById(
          device.clientId
        );
        if (!currentClient) {
          throw new Error("Current client not found");
        }

        await clientRepository.updateClient(currentClient.id, {
          userId: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          isRegistered: true,
          lastLoginAt: new Date(),
        });

        const updatedClient = await clientRepository.getClientWithPlan(
          currentClient.id
        );
        if (!updatedClient) throw new Error("Failed to get updated client");

        finalClient = updatedClient;

        console.log(
          `✅ 新規ユーザー紐付け (userId: ${user.id}, clientId: ${currentClient.id})`
        );
      }

      if (!finalClient.plan) throw new Error("Failed to get updated client");

      // アプリ用JWT生成（既存パターンに合わせて）
      const token = await this.generateAppJWT({
        t: "app",
        deviceId: device.deviceId,
        clientId: finalClient.id,
        userId: user.id,
        planCode: finalClient.plan.code,
      });

      return { client: finalClient, token };
    });
  }

  /**
   * セッション検証・取得
   */
  async validateSession(token: string): Promise<Client> {
    // JWT検証（既存パターンに合わせて）
    let decoded: JWTPayload;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, {
        algorithms: [ALG],
      });

      if (payload.t !== "app") {
        throw new Error("Invalid token type");
      }

      decoded = payload as unknown as JWTPayload;
    } catch (error) {
      console.error("❌ トークン検証失敗:", error);
      throw new Error("Invalid token");
    }

    const { deviceId, clientId } = decoded;

    if (!deviceId || !clientId) {
      throw new Error("Invalid token payload");
    }

    // デバイス存在確認
    const device = await clientRepository.getDeviceByDeviceId(deviceId);
    if (!device || device.clientId !== clientId) {
      throw new Error("Device not found or client mismatch");
    }

    // クライアント情報取得
    const client = await clientRepository.getClientWithPlan(clientId);
    if (!client) {
      throw new Error("Client not found");
    }

    // デバイスのlastSeenAtを更新
    await clientRepository.updateDevice(device.id, {
      lastSeenAt: new Date(),
    });

    return client;
  }

  /**
   * アプリ用JWT生成（既存パターンに合わせて）
   */
  private async generateAppJWT(payload: JWTPayload): Promise<string> {
    return await new SignJWT(payload as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: ALG })
      .setIssuedAt()
      .setExpirationTime(APP_JWT_TTL)
      .sign(JWT_SECRET);
  }

  /**
   * デバイス連携（既存メソッド）
   */
  async linkDevice(
    deviceId: string,
    clientId?: string
  ): Promise<{
    client: Client;
    device: Device;
  }> {
    return await prisma.$transaction(async (tx) => {
      let client: Client;
      const clientRepo = clientRepository.withTransaction(tx);
      const planRepo = planRepository.withTransaction(tx);

      if (clientId) {
        // 既存ユーザー
        const existing = await clientRepo.getClientById(clientId);
        if (!existing) throw new Error("Client not found");
        client = existing;
      } else {
        // 新規ユーザー（未登録）
        const freePlan = await planRepo.getPlanByCode("FREE");
        if (!freePlan) throw new Error("Free plan not found");

        const clientId = await clientRepo.createClient({
          planId: freePlan.id,
          isRegistered: false,
          dailyReadingsCount: 0,
          dailyCelticsCount: 0,
          dailyPersonalCount: 0,
        });

        const created = await clientRepo.getClientById(clientId);
        if (!created) throw new Error("Failed to create client");
        client = created;
      }

      // デバイス登録
      const existingDevice = await clientRepo.getDeviceByDeviceId(deviceId);
      if (existingDevice) {
        // 既存デバイスの更新
        await clientRepo.updateDevice(existingDevice.id, {
          clientId: client.id,
          lastSeenAt: new Date(),
        });
        return { client, device: existingDevice };
      } else {
        // 新規デバイス登録
        const deviceDbId = await clientRepo.createDevice({
          deviceId,
          clientId: client.id,
          lastSeenAt: new Date(),
        });

        const device = await clientRepo.getDeviceById(deviceDbId);
        if (!device) throw new Error("Failed to create device");

        return { client, device };
      }
    });
  }

  /**
   * ユーザー登録（既存メソッド）
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

  /**
   * API リクエストの認証をチェック（ゲスト・ユーザー両対応）
   * @returns { payload } または { error: NextResponse }
   */
  async verifyApiRequest(
    request: NextRequest
  ): Promise<{ client: Client } | { error: NextResponse }> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return {
        error: NextResponse.json({ error: "認証が必要です" }, { status: 401 }),
      };
    }

    try {
      const client = await this.validateSession(authHeader.substring(7));
      return { client };
    } catch (error) {
      console.error("❌ APIリクエスト認証エラー:", error);
      return {
        error: NextResponse.json({ error: "認証失敗" }, { status: 401 }),
      };
    }
  }
}

export const authService = new AuthService();
