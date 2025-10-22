import {
  AppJWTPayload,
  AppStateCheckRequest,
  Plan,
  type Client,
  type TicketData,
} from "@/../shared/lib/types";
import { auth, signOut } from "@/auth";
import { logWithContext } from "@/lib/server/logger/logger";
import {
  authRepository,
  BaseRepository,
  clientRepository,
  planRepository,
} from "@/lib/server/repositories";
import { clientService } from "@/lib/server/services";
import { decodeJWT, generateJWT } from "@/lib/utils/jwt";
import { createHash } from "crypto";
import { importPKCS8, SignJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = process.env.AUTH_SECRET;
if (!JWT_SECRET) {
  logWithContext("error", "❌ AUTH_SECRET is not defined", { status: 500 });
  throw new Error("AUTH_SECRET environment variable is required");
}

const TOKEN_KEY = "access_token";

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

    if (!session?.user?.id || !session?.user?.email || !session?.provider) {
      logWithContext("error", "❌ Not authenticated", { session });
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
   * ✅ 修正: ticketの使い捨て実装
   */
  async exchangeTicket(params: {
    ticket: string;
    deviceId: string;
  }): Promise<string> {
    logWithContext("info", "📄 exchangeTicket called", { params });

    // チケット検証
    let ticketData: TicketData;
    try {
      const payload = await decodeJWT<TicketData>(params.ticket, JWT_SECRET);

      if (payload.t !== "ticket" || !payload.sub) {
        throw new Error("Invalid ticket type");
      }

      ticketData = payload as unknown as TicketData;
    } catch (error) {
      logWithContext("error", "❌ チケット検証失敗:", { error });
      throw new Error("Invalid ticket");
    }

    // ✅ ticketのハッシュ生成（元の文字列は保存しない）
    const ticketHash = createHash("sha256").update(params.ticket).digest("hex");

    return BaseRepository.transaction(
      { client: clientRepository, auth: authRepository },
      async ({ client, auth }) => {
        // ✅ 使用済みticketチェック
        const usedTicket = await auth.findUsedTicket(ticketHash);
        if (usedTicket) {
          logWithContext("error", "❌ Ticket already used", {
            ticketHash,
            usedAt: usedTicket.usedAt,
            deviceId: usedTicket.deviceId,
          });
          throw new Error("Ticket already used");
        }

        // デバイス取得
        const device = await client.getDeviceByDeviceId(params.deviceId);
        if (!device || !device.clientId || !device.client) {
          throw new Error("Device not found. Please register device first.");
        }

        const clientData = device.client;
        if (!clientData.plan) {
          throw new Error("Failed to get updated client");
        }

        // プロバイダーの設定
        const provider = ticketData.provider;
        if (!provider) {
          // NOTE: OAuthèªè¨¼ä»¥å¤–ã‚'è¿½åŠ ã—ãŸå ´åˆã«ã¯ã€ã"ã"ã‚'ä¿®æ­£
          throw new Error("Provider not found");
        }

        // プランコードの変更(GUEST → FREE など)
        const planCode =
          clientData.plan.code === "GUEST" ? "FREE" : clientData.plan.code;

        // ユーザーの照合
        const user = await auth.getUserById(ticketData.sub);
        if (!user) {
          throw new Error("User not found in DB.");
        }

        const existingClient = user.client;
        let finalClient: Client;

        // user と 別の Client が紐付いている場合は統合
        if (existingClient && existingClient.id !== device.clientId) {
          finalClient = await this.mergeClientsInTransaction(
            { client, auth, plan: planRepository },
            device.clientId,
            existingClient.id,
            provider,
            planCode
          );
        } else {
          finalClient = await client.updateClient(device.clientId, {
            user: { connect: { id: user.id } },
            email: user.email,
            name: user.name,
            image: user.image,
            provider,
            plan: { connect: { code: planCode } },
            isRegistered: true,
            lastLoginAt: new Date(),
          });
        }

        if (!finalClient || !finalClient.plan) {
          throw new Error("Failed to get final client or plan");
        }

        // ✅ ticketを使用済みにマーク（有効期限2分後）
        await auth.markTicketAsUsed({
          ticketHash,
          userId: user.id,
          deviceId: params.deviceId,
          expiresAt: new Date(Date.now() + 2 * 60 * 1000),
        });
        logWithContext("info", "✅ Ticket marked as used", { ticketHash });

        // アプリ用JWT生成
        const jwt = await generateJWT<AppJWTPayload>(
          {
            t: "app",
            deviceId: device.deviceId,
            clientId: finalClient.id,
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

        return jwt;
      }
    );
  }

  /**
   * サインアウト
   */
  async signOut(request: NextRequest): Promise<string> {
    logWithContext("info", "🔄 signOut called", { request });
    const payload = await this.getPayloadFromRequest(request);
    // いずれにしろ Auth.js5.0 のサインアウトするが、証跡だけログに残す
    signOut();
    if (payload.user && payload.user.id) {
      logWithContext("info", "✅ User signed out", { userId: payload.user.id });
    } else {
      logWithContext("warn", "⚠️ No user to sign out", { payload });
    }
    // client, device の存在確認をし、なければトークンとの紐付けを切って、新しいトークンを発行する
    const device = await clientService.getDeviceById(payload.deviceId);
    if (!device) {
      // device が存在しない場合は救済しない(よっぽどのことがないと発生しないと思われる)
      logWithContext("error", "device not found. token will be invalidated", {
        payload,
      });
      throw new Error("Device not found");
    }
    const client = await device.client;
    // device が存在し、client が存在しない場合は client の紐付けを切り、デバイス再登録
    if (!client) {
      logWithContext("warn", "client not found. re-registerDevice", {
        payload,
      });
      return await this.registerOrUpdateDevice({
        deviceId: payload.deviceId,
        platform: device.platform || undefined,
        appVersion: device.appVersion || undefined,
        osVersion: device.osVersion || undefined,
        pushToken: device.pushToken || undefined,
      });
    } else {
      // client, device 両方存在する場合はそのまま返す
      logWithContext(
        "info",
        "✅ Client and Device found, token remains valid",
        {
          payload,
        }
      );
      // GUESTに戻す
      const newClient = await clientService.changePlan(client.id, "GUEST");
      return await generateJWT<AppJWTPayload>(
        {
          t: "app",
          deviceId: device.deviceId,
          clientId: newClient.id,
          provider: undefined,
          user: undefined,
        },
        JWT_SECRET
      );
    }
  }

  /**
   * ** 重要!! **
   * Client統合(ユーザーが複数Clientを持ってしまった場合の救済用)
   * planはより上位のものを適用
   * 利用回数は合算
   */
  private async mergeClientsInTransaction(
    txRepos: {
      client: typeof clientRepository;
      auth: typeof authRepository;
      plan: typeof planRepository;
    },
    deviceClientId: string, // デバイスのClient（統合元）
    userClientId: string, // ユーザーのClient（統合先）
    provider: string,
    newPlanCode: string
  ): Promise<Client> {
    logWithContext("info", "🔀 Merging clients", {
      deviceClient: deviceClientId,
      userClient: userClientId,
    });

    const { client: clientRepo, plan: planRepo } = txRepos;

    if (deviceClientId === userClientId) {
      throw new Error("Cannot merge the same client");
    }

    const deviceClient = await clientRepo.getClientWithAllRelations(
      deviceClientId
    );
    if (!deviceClient) {
      throw new Error("Device client not found");
    }

    const userClient = await clientRepo.getClientWithAllRelations(userClientId);
    if (!userClient) {
      throw new Error("User client not found");
    }

    // 削除済みチェック
    if (deviceClient.deletedAt || userClient.deletedAt) {
      throw new Error("Cannot merge deleted clients");
    }

    // userClientは必ずuserIdを持つ
    if (!userClient.userId) {
      throw new Error("User client has no userId");
    }

    // planは上位のものを使用
    const newPlan = await planRepo.getPlanByCode(newPlanCode);
    const plans = [deviceClient.plan, userClient.plan, newPlan].filter(
      Boolean
    ) as Plan[];
    const higherPlan = plans.reduce((prev, curr) =>
      curr.no > prev.no ? curr : prev
    );

    // 利用回数は合算
    const sumReadingsCount =
      (deviceClient.dailyReadingsCount || 0) +
      (userClient.dailyReadingsCount || 0);
    const sumCelticsCount =
      (deviceClient.dailyCelticsCount || 0) +
      (userClient.dailyCelticsCount || 0);
    const sumPersonalCount =
      (deviceClient.dailyPersonalCount || 0) +
      (userClient.dailyPersonalCount || 0);

    // 最終利用日は新しい方
    const lastReadingDate = [
      deviceClient.lastReadingDate,
      userClient.lastReadingDate,
    ]
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0];

    const lastCelticReadingDate = [
      deviceClient.lastCelticReadingDate,
      userClient.lastCelticReadingDate,
    ]
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0];

    const lastPersonalReadingDate = [
      deviceClient.lastPersonalReadingDate,
      userClient.lastPersonalReadingDate,
    ]
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0];

    // デバイス統合（deviceIdで重複除去）
    const allDevices = [
      ...(deviceClient.devices || []),
      ...(userClient.devices || []),
    ];
    const uniqueDevices = Array.from(
      new Map(allDevices.map((d) => [d.deviceId, d])).values()
    );

    const lastLoginAt =
      [deviceClient.lastLoginAt, userClient.lastLoginAt]
        .filter(Boolean)
        .sort((a, b) => b!.getTime() - a!.getTime())[0] || new Date();

    // お気に入りスプレッド統合
    const allFavoriteSpreads = [
      ...(deviceClient.favoriteSpreads || []),
      ...(userClient.favoriteSpreads || []),
    ];
    const uniqueFavoriteSpreads = Array.from(
      new Map(allFavoriteSpreads.map((s) => [s.spreadId, s])).values()
    );

    const allReadings = [
      ...(deviceClient.readings || []),
      ...(userClient.readings || []),
    ];
    const allPlanChangeHistories = [
      ...(deviceClient.planChangeHistories || []),
      ...(userClient.planChangeHistories || []),
    ];
    const allChatMessages = [
      ...(deviceClient.chatMessages || []),
      ...(userClient.chatMessages || []),
    ];

    // userClientを更新
    const updatedClient = (await clientRepo.updateClient(userClient.id, {
      user: { connect: { id: userClient.userId } },
      name: userClient.name || deviceClient.name,
      email: userClient.email || deviceClient.email,
      image: userClient.image || deviceClient.image,
      provider,
      plan: { connect: { id: higherPlan.id } },
      dailyReadingsCount: Math.min(sumReadingsCount, higherPlan.maxReadings),
      dailyCelticsCount: Math.min(sumCelticsCount, higherPlan.maxCeltics),
      dailyPersonalCount: Math.min(sumPersonalCount, higherPlan.maxPersonal),
      lastReadingDate,
      lastCelticReadingDate,
      lastPersonalReadingDate,
      devices: { connect: uniqueDevices.map((d) => ({ id: d.id })) },
      isRegistered: true,
      lastLoginAt,
      favoriteSpreads: {
        connect: uniqueFavoriteSpreads.map((s) => ({ id: s.id })),
      },
      readings: { connect: allReadings.map((r) => ({ id: r.id })) },
      planChangeHistories: {
        connect: allPlanChangeHistories.map((p) => ({ id: p.id })),
      },
      chatMessages: { connect: allChatMessages.map((c) => ({ id: c.id })) },
    })) as Client;

    // deviceClientを論理削除
    await clientRepo.softDeleteClient(deviceClient.id);

    return updatedClient;
  }

  async cleanupExpiredTickets(): Promise<number> {
    return await authRepository.cleanupExpiredTickets();
  }

  /**
   * JWTペイロード更新(プラン変更時など)
   */
  async refreshJwtPayload(payload: AppJWTPayload): Promise<string> {
    // アプリ用JWT生成(既存パターンに合わせて)
    return await generateJWT<AppJWTPayload>(
      {
        t: "app",
        deviceId: payload.deviceId,
        clientId: payload.clientId,
        provider: payload.provider,
        user: payload.user,
      },
      JWT_SECRET
    );
  }

  /**
   * 期限切れ・OAuth認証時は認証期限切れの検出とJWTペイロード更新
   * mobile/web 両対応
   */
  async detectTokenExpirationAndRefresh(request: NextRequest): Promise<string> {
    // エラー処理は route 側で行う
    logWithContext("info", "🔑 Detecting token expiration and refreshing...");
    const authHeader = request.headers.get("authorization");
    let token: string | undefined;
    if (authHeader) {
      // 1.mobile 検証
      if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("認証が必要です");
      }
      token = authHeader.substring(7);
    } else {
      // 2.web 検証
      token = request.cookies.get("access_token")?.value;
      if (!token) {
        throw new Error("認証が必要です");
      }
    }

    logWithContext("info", "🔑 decodeJWT token:", {
      token,
    });
    const payload = await decodeJWT<AppJWTPayload>(token, JWT_SECRET, true);

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
  ): Promise<{ payload: AppJWTPayload } | { error: NextResponse }> {
    try {
      const payload = await this.getPayloadFromRequest(request);
      return { payload };
    } catch (error) {
      logWithContext("error", "❌ APIリクエスト認証エラー:", { error });
      return {
        error: NextResponse.json({ error: "認証失敗" }, { status: 401 }),
      };
    }
  }

  private getPayloadFromRequest(
    request: NextRequest | string
  ): Promise<AppJWTPayload> {
    const authHeader =
      request instanceof NextRequest
        ? request.headers.get("authorization")
        : (request as string);
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("認証が必要です");
    }

    try {
      const payload = decodeJWT<AppJWTPayload>(
        authHeader.substring(7),
        JWT_SECRET,
        true
      );
      return payload;
    } catch (error) {
      logWithContext("error", "❌ getPayloadFromRequest error:", { error });
      throw error;
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
        payload: { t, deviceId, clientId },
      } = verifyJwt;
      // 正常ケース
      if (t === "app" && deviceId === body.deviceId && clientId) {
      }
    }
    return body;
  }

  /**
   * トークンとCookieをセットしたレスポンスを返す (mobile/web対応)
   */
  respondWithTokenAndCookie(token: string): NextResponse {
    const res = NextResponse.json({ token });
    // web対応: Cookieに新しいトークンをセット
    res.cookies.set(TOKEN_KEY, token, {
      httpOnly: true,
      secure: true,
      path: "/",
      maxAge: 60 * 60,
      sameSite: "lax",
    });
    return res;
  }

  /**
   * トークンは残し、Cookieをクリアしたレスポンスを返す (mobile/web対応)
   */
  respondWithTokenAndClearedCookie(token: string): NextResponse {
    const res = NextResponse.json({ token });
    // web対応: Cookieをクリア
    res.cookies.delete(TOKEN_KEY);
    return res;
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
