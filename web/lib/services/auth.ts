import {
  JWTPayload,
  type Client,
  type TicketData,
} from "@/../shared/lib/types";
import { auth } from "@/auth";
import { authRepository } from "@/lib/repositories/auth";
import { clientRepository } from "@/lib/repositories/client";
import { prisma } from "@/lib/repositories/database";
import { decodeJWT, generateJWT } from "@/lib/utils/jwt";
import { importPKCS8, SignJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = process.env.AUTH_SECRET;
console.log("🔑 AuthService initialized:", JWT_SECRET);
if (!JWT_SECRET) {
  throw new Error("AUTH_SECRET environment variable is required");
}

export class AuthService {
  /**
   * デバイス登録・再登録（Tauri起動時）
   */
  async registerOrUpdateDevice(params: {
    deviceId: string;
    platform?: string;
    appVersion?: string;
    osVersion?: string;
    pushToken?: string;
  }): Promise<string> {
    return await prisma.$transaction(async (tx) => {
      // トランザクション付きRepositoryインスタンス作成
      const clientRepo = clientRepository.withTransaction(tx);

      // 既存デバイスを確認(include: client.plan)
      let device = await clientRepo.getDeviceByDeviceId(params.deviceId);

      if (device) {
        // デバイス情報を更新
        device = await clientRepo.updateDevice(device.id, {
          platform: params.platform,
          appVersion: params.appVersion,
          osVersion: params.osVersion,
          pushToken: params.pushToken,
          lastSeenAt: new Date(),
        });
      } else {
        // 新規デバイス - 新規クライアント作成 （未登録ユーザー）
        device = await clientRepo.createDevice({
          deviceId: params.deviceId,
          platform: params.platform,
          appVersion: params.appVersion,
          osVersion: params.osVersion,
          pushToken: params.pushToken,
          lastSeenAt: new Date(),
          client: { create: { plan: { connect: { code: "GUEST" } } } },
        });
      }
      if (!device) throw new Error("Failed to create device");
      const client = device.client;
      if (!client || !client.plan)
        throw new Error("Client not found for device");

      const token = await generateJWT<JWTPayload>(
        {
          t: "app",
          deviceId: device.deviceId,
          clientId: client.id,
          planCode: client.plan.code,
        },
        JWT_SECRET
      );

      return token;
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
    return await generateJWT<TicketData>(
      {
        t: "ticket",
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name || undefined,
        image: session.user.image || undefined,
        provider: session.provider,
      },
      JWT_SECRET,
      "30s"
    );
  }

  /**
   * チケット交換＋ユーザー紐付け
   */
  async exchangeTicket(params: {
    ticket: string;
    deviceId: string;
  }): Promise<string> {
    // チケット検証（既存パターンに合わせて）
    let ticketData: TicketData;
    try {
      console.log("🔑 チケット検証開始 secret", JWT_SECRET);
      const payload = await decodeJWT<TicketData>(params.ticket, JWT_SECRET);

      if (payload.t !== "ticket" || !payload.sub) {
        console.log("❌ Invalid ticket type:", payload.t);
        throw new Error("Invalid ticket type");
      }

      ticketData = payload as unknown as TicketData;
    } catch (error) {
      console.error("❌ チケット検証失敗:", error);
      throw new Error("Invalid ticket");
    }

    return await prisma.$transaction(async (tx) => {
      const clientRepo = clientRepository.withTransaction(tx);
      const authRepo = authRepository.withTransaction(tx);
      // デバイス取得
      const device = await clientRepo.getDeviceByDeviceId(params.deviceId);
      if (!device || !device.clientId) {
        throw new Error("Device not found. Please register device first.");
      }

      // ユーザーのDBとの照合
      const user = await authRepo.getUserById(ticketData.sub);
      if (!user) {
        throw new Error("User not found in DB.");
      }

      const existingClient = user.client;
      let finalClient: Client;

      // user と 別の Client が紐付いている場合は統合
      if (existingClient) {
        // 既存Clientがある場合：デバイスをそのClientに統合
        finalClient = await this.mergeClients(
          device.clientId,
          existingClient.id
        );
        console.log(
          `✅ 既存Clientに統合 (user: ${user}, client: ${finalClient})`
        );
      } else {
        // 既存Clientがない場合：現在のClientにユーザー情報を紐付け
        finalClient = await clientRepo.updateClient(device.clientId, {
          userId: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          isRegistered: true,
          lastLoginAt: new Date(),
        });
        console.log(
          `✅ 新規ユーザー紐付け (user: ${user}, client: ${finalClient})`
        );
      }

      if (!finalClient.plan) throw new Error("Failed to get updated client");

      // プランコードの変更（GUEST → FREE など）
      const newPlanCode = finalClient.plan.no === 0 ? "FREE" : finalClient.plan.code;

      // アプリ用JWT生成（既存パターンに合わせて）
      return await generateJWT<JWTPayload>(
        {
          t: "app",
          deviceId: device.deviceId,
          clientId: finalClient.id,
          planCode: newPlanCode,
          provider: ticketData.provider,
          user: {
            id: user.id,
            email: user.email!,
            name: user.name || undefined,
            image: user.image || undefined,
          },
        },
        JWT_SECRET
      );
    });
  }

  // ** 重要!! **
  // Client統合（ユーザーが複数Clientを持ってしまった場合の救済用）
  // planはより上位のものを適用
  // 利用回数は合算
  private async mergeClients(
    fromClientId: string,
    toClientId: string
  ): Promise<Client> {
    if (fromClientId === toClientId) {
      throw new Error("Cannot merge the same client");
    }

    let fromClient = await clientRepository.getClientWithAllRelations(
      fromClientId
    );
    if (!fromClient) {
      throw new Error("fromClient not found");
    }

    let toClient = await clientRepository.getClientWithAllRelations(toClientId);
    if (!toClient) {
      throw new Error("toClient not found");
    }

    // 先に作られたClientを優先
    if (fromClient.createdAt < toClient.createdAt) {
      [fromClient, toClient] = [toClient, fromClient];
    }

    // 念の為、deletedAt チェック
    if (fromClient.deletedAt || toClient.deletedAt) {
      throw new Error("Cannot merge deleted clients");
    }

    // 念の為、userId チェック(toClient.userId が優先)
    const userId = toClient.userId || fromClient.userId;
    if (!userId) {
      throw new Error("Cannot merge clients with different userId");
    }

    // plan情報は、より上位のものを適用
    const higherPlan =
      fromClient.plan && toClient.plan
        ? fromClient.plan.no > toClient.plan.no
          ? fromClient.plan
          : toClient.plan
        : fromClient.plan || toClient.plan;

    if (!higherPlan) {
      throw new Error("Both clients have no plan");
    }

    // 利用回数は合算
    const sumReadingsCount =
      (fromClient.dailyReadingsCount || 0) + (toClient.dailyReadingsCount || 0);
    const sumCelticsCount =
      (fromClient.dailyCelticsCount || 0) + (toClient.dailyCelticsCount || 0);
    const sumPersonalCount =
      (fromClient.dailyPersonalCount || 0) + (toClient.dailyPersonalCount || 0);

    // 利用日は新しい方を適用
    const lastReadingDate =
      !fromClient.lastReadingDate || !toClient.lastReadingDate
        ? fromClient.lastReadingDate || toClient.lastReadingDate
        : fromClient.lastReadingDate > toClient.lastReadingDate
        ? fromClient.lastReadingDate
        : toClient.lastReadingDate;

    const lastCelticReadingDate =
      !fromClient.lastCelticReadingDate || !toClient.lastCelticReadingDate
        ? fromClient.lastCelticReadingDate || toClient.lastCelticReadingDate
        : fromClient.lastCelticReadingDate > toClient.lastCelticReadingDate
        ? fromClient.lastCelticReadingDate
        : toClient.lastCelticReadingDate;

    const lastPersonalReadingDate =
      !fromClient.lastPersonalReadingDate || !toClient.lastPersonalReadingDate
        ? fromClient.lastPersonalReadingDate || toClient.lastPersonalReadingDate
        : fromClient.lastPersonalReadingDate > toClient.lastPersonalReadingDate
        ? fromClient.lastPersonalReadingDate
        : toClient.lastPersonalReadingDate;

    // fromClientのデバイスをすべてtoClientに移動
    const devices =
      fromClient.devices && toClient.devices
        ? [
            ...fromClient.devices,
            ...toClient.devices.filter(
              (d2) =>
                !fromClient.devices?.some((d1) => d1.deviceId === d2.deviceId)
            ),
          ]
        : fromClient.devices || toClient.devices || [];

    const isRegistered = fromClient.isRegistered || toClient.isRegistered;

    const lastLoginAt =
      fromClient.lastLoginAt && toClient.lastLoginAt
        ? fromClient.lastLoginAt > toClient.lastLoginAt
          ? fromClient.lastLoginAt
          : toClient.lastLoginAt
        : fromClient.lastLoginAt || toClient.lastLoginAt;

    const favoriteSpreads =
      fromClient.favoriteSpreads && toClient.favoriteSpreads
        ? [
            ...fromClient.favoriteSpreads,
            ...toClient.favoriteSpreads.filter(
              (s2) =>
                !fromClient.favoriteSpreads?.some(
                  (s1) => s1.spreadId === s2.spreadId
                )
            ),
          ]
        : fromClient.favoriteSpreads || toClient.favoriteSpreads || [];

    const readings =
      fromClient.readings && toClient.readings
        ? [
            ...fromClient.readings,
            ...toClient.readings.filter(
              (r2) => !fromClient.readings?.some((r1) => r1.id === r2.id)
            ),
          ]
        : fromClient.readings || toClient.readings || [];

    const planChangeHistories =
      fromClient.planChangeHistories && toClient.planChangeHistories
        ? [
            ...fromClient.planChangeHistories,
            ...toClient.planChangeHistories.filter(
              (p2) =>
                !fromClient.planChangeHistories?.some((p1) => p1.id === p2.id)
            ),
          ]
        : fromClient.planChangeHistories || toClient.planChangeHistories || [];

    const chatMessages =
      fromClient.chatMessages && toClient.chatMessages
        ? [
            ...fromClient.chatMessages,
            ...toClient.chatMessages.filter(
              (c2) => !fromClient.chatMessages?.some((c1) => c1.id === c2.id)
            ),
          ]
        : fromClient.chatMessages || toClient.chatMessages || [];

    // fromClientのデバイスをすべてtoClientに移動
    return (await clientRepository.updateClient(toClient.id, {
      userId,
      name: toClient.name || fromClient.name,
      email: toClient.email || fromClient.email,
      image: toClient.image || fromClient.image,
      planId: higherPlan.id,
      dailyReadingsCount: Math.min(sumReadingsCount, higherPlan.maxReadings),
      dailyCelticsCount: Math.min(sumCelticsCount, higherPlan.maxCeltics),
      dailyPersonalCount: Math.min(sumPersonalCount, higherPlan.maxPersonal),
      lastReadingDate,
      lastCelticReadingDate,
      lastPersonalReadingDate,
      devices: { connect: devices.map((d) => ({ id: d.id })) },
      isRegistered,
      lastLoginAt,
      favoriteSpreads: { connect: favoriteSpreads.map((s) => ({ id: s.id })) },
      readings: { connect: readings.map((r) => ({ id: r.id })) },
      planChangeHistories: {
        connect: planChangeHistories.map((p) => ({ id: p.id })),
      },
      chatMessages: { connect: chatMessages.map((c) => ({ id: c.id })) },
    })) as Client;
  }

  /**
   * JWTペイロード更新（プラン変更時など）
   */
  async refreshJwtPayload(
    payload: JWTPayload & { exp?: number },
    planCode?: string
  ): Promise<string> {
    // アプリ用JWT生成（既存パターンに合わせて）
    return await generateJWT<JWTPayload>(
      {
        t: "app",
        deviceId: payload.deviceId,
        clientId: payload.clientId,
        planCode: planCode || payload.planCode,
        provider: payload.provider,
        user: payload.user,
      },
      JWT_SECRET
    );
  }

  /**
   * 期限切れ・OAuth認証時は認証期限切れの検出とJWTペイロード更新
   */
  async detectTokenExpirationAndRefresh(
    request: NextRequest
  ): Promise<string> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("認証が必要です");
    }

    try {
      console.log("🔑 decodeJWT token", authHeader.substring(7));
      const payload = await decodeJWT<JWTPayload>(
        authHeader.substring(7),
        JWT_SECRET,
        true
      );

      // 期限切れでもpayloadを取得できるため、ここでログ出力
      console.log("🔑 Token payload (not check expiration):", payload);

      // OAuth認証時は auth() を呼んで認証期限切れを検出
      if (payload.user && payload.provider) {
        const session = await auth();
        if (!session?.user?.id || !session?.user?.email) {
          console.log("⚠️ OAuth認証期限切れ検出");
          throw new Error("OAuth session expired");
        }
      }

      return this.refreshJwtPayload(payload);
    } catch (error) {
      console.error("❌ APIリクエスト認証エラー:", error);
      throw new Error("認証リフレッシュ失敗");
    }
  }

  /**
   * API リクエストの認証をチェック（ゲスト・ユーザー両対応）
   * @returns { payload } または { error: NextResponse }
   */
  async verifyApiRequest(
    request: NextRequest
  ): Promise<{ payload: JWTPayload & { exp?: number } } | { error: NextResponse }> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return {
        error: NextResponse.json({ error: "認証が必要です" }, { status: 401 }),
      };
    }

    try {
      const payload = await decodeJWT<JWTPayload>(
        authHeader.substring(7),
        JWT_SECRET
      );
      return { payload };
    } catch (error) {
      console.error("❌ APIリクエスト認証エラー:", error);
      return {
        error: NextResponse.json({ error: "認証失敗" }, { status: 401 }),
      };
    }
  }

  async createAppleClientSecret(opts: {
    teamId: string          // Apple Developer Team ID
    keyId: string           // Key ID (.p8 に対応)
    clientId: string        // Service ID (例: com.example.web)
    privateKey: string      // .p8 の中身
    expiresIn?: string|number // 例: '30d'（最大180日）
  }): Promise<string> {
    const alg = 'ES256'
    const ecKey = await importPKCS8(opts.privateKey, alg)
    const now = Math.floor(Date.now() / 1000)

    return await new SignJWT({})
      .setProtectedHeader({ alg, kid: opts.keyId })
      .setIssuer(opts.teamId)                        // iss
      .setSubject(opts.clientId)                     // sub
      .setAudience('https://appleid.apple.com')      // aud
      .setIssuedAt(now)
      .setExpirationTime(opts.expiresIn ?? '30d')    // ← 短め推奨
      .sign(ecKey)
  }

}

export const authService = new AuthService();
