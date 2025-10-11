import {
  AppJWTPayload,
  AppStateCheckRequest,
  Plan,
  type Client,
  type TicketData,
} from "@/../shared/lib/types";
import { auth } from "@/auth";
import { authRepository } from "@/lib/repositories/auth";
import { BaseRepository } from "@/lib/repositories/base";
import { clientRepository } from "@/lib/repositories/client";
import { decodeJWT, generateJWT } from "@/lib/utils/jwt";
import { importPKCS8, SignJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { logWithContext } from "../logger/logger";
import { planRepository } from "../repositories";
import { clientService } from "./client";

const JWT_SECRET = process.env.AUTH_SECRET;
if (!JWT_SECRET) {
  logWithContext("error", "❌ AUTH_SECRET is not defined", { status: 500 });
  throw new Error("AUTH_SECRET environment variable is required");
}

export class AuthService {
  /**
   * デバイス登録・再登録(Tauri起動時)
   */
  async registerOrUpdateDevice(params: {
    deviceId: string;
    platform?: string;
    appVersion?: string;
    osVersion?: string;
    pushToken?: string;
  }): Promise<string> {
    logWithContext("info", "🔄 registerOrUpdateDevice called", { params });

    return BaseRepository.transaction(
      { client: clientRepository },
      async ({ client }) => {
        // 既存デバイスを確認(include: client.plan)
        let device = await client.getDeviceByDeviceId(params.deviceId);

        if (device) {
          // デバイス情報を更新
          device = await client.updateDevice(device.id, {
            platform: params.platform,
            appVersion: params.appVersion,
            osVersion: params.osVersion,
            pushToken: params.pushToken,
            lastSeenAt: new Date(),
          });
          logWithContext("info", "✅ Device updated:", { device });
        } else {
          // 新規デバイス - 新規クライアント作成 (未登録ユーザー)
          device = await client.createDevice({
            deviceId: params.deviceId,
            platform: params.platform,
            appVersion: params.appVersion,
            osVersion: params.osVersion,
            pushToken: params.pushToken,
            lastSeenAt: new Date(),
            client: { create: { plan: { connect: { code: "GUEST" } } } },
          });
          logWithContext("info", "✅ Device created:", { device });
        }

        if (!device) throw new Error("Failed to create device");
        logWithContext("info", "✅ Device registered/updated:", { device });

        const clientData = device.client;
        if (!clientData || !clientData.plan) {
          logWithContext("error", "❌ Client not found for device", { device });
          throw new Error("Client not found for device");
        }

        logWithContext("info", "✅ Client for device:", { client: clientData });

        const user = clientData.user;
        logWithContext("info", "👤 Associated user:", { user });

        // デバイス登録・更新処理では、既にユーザーが紐づいている可能性もあるため、ユーザー情報も設定
        const token = await generateJWT<AppJWTPayload>(
          {
            t: "app",
            deviceId: device.deviceId,
            clientId: clientData.id,
            planCode: clientData.plan.code,
            provider: clientData.provider || undefined,
            user: user
              ? {
                  id: user.id,
                  email: user.email || undefined,
                  name: user.name || undefined,
                  image: user.image || undefined,
                }
              : undefined,
          },
          JWT_SECRET
        );

        return token;
      }
    );
  }

  /**
   * チケット生成(Web認証後)
   */
  async generateTicket(): Promise<string> {
    logWithContext("info", "🔄 generateTicket called");
    const session = await auth();
    logWithContext("info", "🔍 Current session:", { session });

    if (!session?.user?.id || !session?.user?.email) {
      throw new Error("Not authenticated");
    }

    logWithContext("info", "✅ チケット発行成功", { userId: session.user.id });

    // 30秒間有効なチケットを発行(既存パターンに合わせて)
    const ticket = await generateJWT<TicketData>(
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
    logWithContext("info", "🔑 Ticket generated:", { ticket });
    return ticket;
  }

  /**
   * チケット交換+ユーザー紐付け
   */
  async exchangeTicket(params: {
    ticket: string;
    deviceId: string;
  }): Promise<string> {
    logWithContext("info", "🔄 exchangeTicket called", { params });

    // チケット検証(既存パターンに合わせて)
    let ticketData: TicketData;
    try {
      logWithContext("info", "🔑 チケット検証開始 secret", {
        secret: JWT_SECRET,
      });
      const payload = await decodeJWT<TicketData>(params.ticket, JWT_SECRET);

      if (payload.t !== "ticket" || !payload.sub) {
        logWithContext("error", "❌ Invalid ticket type:", { type: payload.t });
        throw new Error("Invalid ticket type");
      }

      ticketData = payload as unknown as TicketData;
    } catch (error) {
      logWithContext("error", "❌ チケット検証失敗:", { error });
      throw new Error("Invalid ticket");
    }

    return BaseRepository.transaction(
      { client: clientRepository, auth: authRepository },
      async ({ client, auth }) => {
        // デバイス取得
        const device = await client.getDeviceByDeviceId(params.deviceId);
        logWithContext("info", "🔍 デバイス検索", {
          deviceId: params.deviceId,
          device,
        });

        if (!device || !device.clientId || !device.client) {
          logWithContext("error", "❌ Device not found or invalid:", {
            deviceId: params.deviceId,
            device,
          });
          throw new Error("Device not found. Please register device first.");
        }

        const clientData = device.client;
        if (!clientData.plan) {
          logWithContext("error", "❌ Client or plan not found for device:", {
            device,
            client: clientData,
            plan: clientData.plan,
          });
          throw new Error("Failed to get updated client");
        }

        // プロバイダーの設定
        const provider = ticketData.provider;
        if (!provider) {
          // NOTE: OAuth認証以外を追加した場合には、ここを修正
          logWithContext("error", "❌ Provider not found in ticket data:", {
            ticketData,
          });
          throw new Error("Provider not found");
        }

        // プランコードの変更(GUEST → FREE など)
        logWithContext("info", "🔄 プランコード確認", {
          current: clientData.plan.code,
          no: clientData.plan.no,
        });
        const planCode =
          clientData.plan.code === "GUEST" ? "FREE" : clientData.plan.code;

        // ユーザーのDBとの照合
        const user = await auth.getUserById(ticketData.sub);
        logWithContext("info", "🔍 ユーザー検索", {
          userId: ticketData.sub,
          user,
        });
        if (!user) {
          logWithContext("error", "❌ User not found in DB:", {
            userId: ticketData.sub,
          });
          throw new Error("User not found in DB.");
        }

        const existingClient = user.client;
        logWithContext("info", "🔍 既存Client", { existingClient });
        let finalClient: Client;

        // user と 別の Client が紐付いている場合は統合
        if (existingClient && existingClient.id !== device.clientId) {
          // 既存Clientがある場合:デバイスをそのClientに統合
          finalClient = await this.mergeClientsInTransaction(
            { client, auth, plan: planRepository },
            device.clientId,
            existingClient.id,
            provider, // provider は必ず更新
            planCode
          );
          logWithContext("info", "✅ 既存Clientに統合", {
            user,
            client: finalClient,
          });
        } else {
          // 既存Clientがない場合:現在のClientにユーザー情報を紐付け
          finalClient = await client.updateClient(device.clientId, {
            user: { connect: { id: user.id } },
            email: user.email,
            name: user.name,
            image: user.image,
            provider, // provider を設定
            plan: { connect: { code: planCode } },
            isRegistered: true,
            lastLoginAt: new Date(),
          });
          logWithContext("info", "✅ 新規ユーザー紐付け", {
            user,
            client: finalClient,
          });
        }

        if (!finalClient || !finalClient.plan) {
          logWithContext(
            "error",
            "❌ Failed to get final client or plan after merge/update",
            { finalClient }
          );
          throw new Error("Failed to get final client or plan");
        }

        // アプリ用JWT生成(既存パターンに合わせて)
        const jwt = await generateJWT<AppJWTPayload>(
          {
            t: "app",
            deviceId: device.deviceId,
            clientId: finalClient.id,
            planCode: finalClient.plan.code,
            provider,
            user: {
              id: user.id,
              email: user.email!,
              name: user.name || undefined,
              image: user.image || undefined,
            },
          },
          JWT_SECRET
        );
        logWithContext("info", "🔑 JWT generated for device:", {
          deviceId: device.deviceId,
          jwt,
        });
        return jwt;
      }
    );
  }

  // ** 重要!! **
  // Client統合(ユーザーが複数Clientを持ってしまった場合の救済用)
  // planはより上位のものを適用
  // 利用回数は合算
  // トランザクション内で呼ばれることを想定し、txRepos を受け取る
  private async mergeClientsInTransaction(
    txRepos: {
      client: typeof clientRepository;
      auth: typeof authRepository;
      plan: typeof planRepository;
    },
    fromClientId: string,
    toClientId: string,
    provider: string,
    newPlanCode: string
  ): Promise<Client> {
    logWithContext("info", "🔀 Merging clients", {
      from: fromClientId,
      to: toClientId,
    });

    const { client: clientRepo, plan: planRepo } = txRepos;

    if (fromClientId === toClientId) {
      throw new Error("Cannot merge the same client");
    }

    let fromClient = await clientRepo.getClientWithAllRelations(fromClientId);
    if (!fromClient) {
      logWithContext("error", "❌ fromClient not found", { fromClientId });
      throw new Error("fromClient not found");
    }

    let toClient = await clientRepo.getClientWithAllRelations(toClientId);
    if (!toClient) {
      logWithContext("error", "❌ toClient not found", { toClientId });
      throw new Error("toClient not found");
    }
    logWithContext("info", "🔍 fromClient, toClient", { fromClient, toClient });

    // 先に作られたClientを優先
    if (fromClient.createdAt < toClient.createdAt) {
      [fromClient, toClient] = [toClient, fromClient];
    }
    logWithContext("info", "🔄 Swapped if needed from, to", {
      fromClient,
      toClient,
    });

    // 念の為、deletedAt チェック
    if (fromClient.deletedAt || toClient.deletedAt) {
      logWithContext("error", "❌ Cannot merge deleted clients", {
        fromClient,
        toClient,
      });
      throw new Error("Cannot merge deleted clients");
    }

    // 念の為、userId チェック(toClient.userId が優先)
    const userId = toClient.userId || fromClient.userId;
    if (!userId) {
      logWithContext("error", "❌ Both clients have no userId", {
        fromClient,
        toClient,
      });
      throw new Error("Cannot merge clients with different userId");
    }
    logWithContext("info", "👤 Merging for userId:", {
      userId,
      toClientUserId: toClient.userId,
      fromClientUserId: fromClient.userId,
    });

    // plan情報は、より上位のものを適用
    const newPlan = await planRepo.getPlanByCode(newPlanCode);
    const plans = [fromClient.plan, toClient.plan, newPlan].filter(
      Boolean
    ) as Plan[];
    const higherPlan = plans.reduce((prev, curr) =>
      curr.no > prev.no ? curr : prev
    );

    if (!higherPlan) {
      logWithContext("error", "❌ Both clients have no plan", {
        fromClient,
        toClient,
      });
      throw new Error("Both clients have no plan");
    }
    logWithContext("info", "🏆 Higher plan selected:", {
      higherPlan,
      fromClientPlan: fromClient.plan,
      toClientPlan: toClient.plan,
      newPlan,
    });

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
    logWithContext("info", "📱 Merging devices:", { devices });

    const isRegistered = fromClient.isRegistered || toClient.isRegistered;
    logWithContext("info", "🔍 isRegistered:", { isRegistered });

    const lastLoginAt =
      fromClient.lastLoginAt && toClient.lastLoginAt
        ? fromClient.lastLoginAt > toClient.lastLoginAt
          ? fromClient.lastLoginAt
          : toClient.lastLoginAt
        : fromClient.lastLoginAt || toClient.lastLoginAt;
    logWithContext("info", "🕒 lastLoginAt:", { lastLoginAt });

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
    logWithContext("info", "⭐ Merging favoriteSpreads:", { favoriteSpreads });

    const readings =
      fromClient.readings && toClient.readings
        ? [
            ...fromClient.readings,
            ...toClient.readings.filter(
              (r2) => !fromClient.readings?.some((r1) => r1.id === r2.id)
            ),
          ]
        : fromClient.readings || toClient.readings || [];
    logWithContext("info", "🔮 Merging readings:", { readings });

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
    logWithContext("info", "📈 Merging planChangeHistories:", {
      planChangeHistories,
    });

    const chatMessages =
      fromClient.chatMessages && toClient.chatMessages
        ? [
            ...fromClient.chatMessages,
            ...toClient.chatMessages.filter(
              (c2) => !fromClient.chatMessages?.some((c1) => c1.id === c2.id)
            ),
          ]
        : fromClient.chatMessages || toClient.chatMessages || [];
    logWithContext("info", "💬 Merging chatMessages:", { chatMessages });

    // fromClientのデバイスをすべてtoClientに移動
    const updatedClient = (await clientRepo.updateClient(toClient.id, {
      user: { connect: { id: userId } },
      name: toClient.name || fromClient.name,
      email: toClient.email || fromClient.email,
      image: toClient.image || fromClient.image,
      provider,
      plan: { connect: { id: higherPlan.id } },
      dailyReadingsCount: Math.min(sumReadingsCount, higherPlan.maxReadings),
      dailyCelticsCount: Math.min(sumCelticsCount, higherPlan.maxCeltics),
      dailyPersonalCount: Math.min(sumPersonalCount, higherPlan.maxPersonal),
      lastReadingDate,
      lastCelticReadingDate,
      lastPersonalReadingDate,
      devices: { connect: devices.map((d) => ({ id: d.id })) },
      isRegistered,
      lastLoginAt: new Date(), // ログイン直後なので更新
      favoriteSpreads: { connect: favoriteSpreads.map((s) => ({ id: s.id })) },
      readings: { connect: readings.map((r) => ({ id: r.id })) },
      planChangeHistories: {
        connect: planChangeHistories.map((p) => ({ id: p.id })),
      },
      chatMessages: { connect: chatMessages.map((c) => ({ id: c.id })) },
    })) as Client;
    logWithContext("info", "✅ Clients merged into:", { updatedClient });
    return updatedClient;
  }

  /**
   * JWTペイロード更新(プラン変更時など)
   */
  async refreshJwtPayload(
    payload: AppJWTPayload & { exp?: number },
    planCode?: string
  ): Promise<string> {
    // アプリ用JWT生成(既存パターンに合わせて)
    return await generateJWT<AppJWTPayload>(
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
  async detectTokenExpirationAndRefresh(request: NextRequest): Promise<string> {
    // エラー処理は route 側で行う
    logWithContext("info", "🔑 Detecting token expiration and refreshing...");
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("認証が必要です");
    }

    logWithContext("info", "🔑 decodeJWT token:", {
      token: authHeader.substring(7),
    });
    const payload = await decodeJWT<AppJWTPayload>(
      authHeader.substring(7),
      JWT_SECRET,
      true
    );

    // 期限切れでもpayloadを取得できるため、ここでログ出力
    logWithContext("info", "🔑 Token payload (not check expiration):", {
      payload,
    });

    // DBからClient情報を取得
    const clientData = await clientService.getClientByDeviceId(
      payload.deviceId
    );
    if (!clientData || clientData.id !== payload.clientId || !clientData.plan) {
      logWithContext("error", "❌ Client or Device not found for payload:", {
        payload,
      });
      throw new Error("Client not found for payload");
    }
    logWithContext("info", "✅ Client for payload:", {
      clientId: clientData.id,
    });

    // OAuth認証時は auth() を呼んで認証期限切れを検出
    if (payload.user && payload.provider) {
      const session = await auth();
      if (!session?.user?.id || !session?.user?.email) {
        logWithContext("warn", "⚠️ OAuth認証期限切れ検出");
        throw new Error("OAuth session expired");
      }
    }

    logWithContext("info", "✅ Token valid, refreshing JWT payload:", {
      payload,
    });

    return this.refreshJwtPayload(payload);
  }

  /**
   * API リクエストの認証をチェック(ゲスト・ユーザー両対応)
   * @returns { payload } または { error: NextResponse }
   */
  async verifyApiRequest(
    request: NextRequest | string
  ): Promise<
    { payload: AppJWTPayload & { exp?: number } } | { error: NextResponse }
  > {
    const authHeader =
      request instanceof NextRequest
        ? request.headers.get("authorization")
        : (request as string);
    if (!authHeader?.startsWith("Bearer ")) {
      return {
        error: NextResponse.json({ error: "認証が必要です" }, { status: 401 }),
      };
    }

    try {
      const payload = await decodeJWT<AppJWTPayload>(
        authHeader.substring(7),
        JWT_SECRET
      );
      return { payload };
    } catch (error) {
      logWithContext("error", "❌ APIリクエスト認証エラー:", { error });
      return {
        error: NextResponse.json({ error: "認証失敗" }, { status: 401 }),
      };
    }
  }

  /**
   * モバイルアプリ側の状態をチェックする
   */
  async checkAppStatus(
    body: AppStateCheckRequest
  ): Promise<AppStateCheckRequest | { error: NextResponse }> {
    logWithContext("info", "🔄 checkAppStatus called", { body });
    // token ありのケース
    if (body.token) {
      const verifyJwt = await this.verifyApiRequest(body.token); // error を throw しない
      if ("error" in verifyJwt) return verifyJwt; // { error: NextResponse }
      // token 検証開始
      const {
        payload: { t, deviceId, clientId, planCode },
      } = verifyJwt;
      // 正常ケース
      if (t === "app" && deviceId === body.deviceId && clientId && planCode) {
      }
    }
    return body;
  }

  async createAppleClientSecret(opts: {
    teamId: string; // Apple Developer Team ID
    keyId: string; // Key ID (.p8 に対応)
    clientId: string; // Service ID (例: com.example.web)
    privateKey: string; // .p8 の中身
    expiresIn?: string | number; // 例: '30d'(最大180日)
  }): Promise<string> {
    const alg = "ES256";
    const ecKey = await importPKCS8(opts.privateKey, alg);
    const now = Math.floor(Date.now() / 1000);

    return await new SignJWT({})
      .setProtectedHeader({ alg, kid: opts.keyId })
      .setIssuer(opts.teamId) // iss
      .setSubject(opts.clientId) // sub
      .setAudience("https://appleid.apple.com") // aud
      .setIssuedAt(now)
      .setExpirationTime(opts.expiresIn ?? "30d") // ← 短め推奨
      .sign(ecKey);
  }
}

export const authService = new AuthService();
