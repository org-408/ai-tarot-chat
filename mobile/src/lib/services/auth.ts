// lib/services/auth.ts
import type { JWTPayload } from "../../../../shared/lib/types";
// import { getVersion } from "@tauri-apps/api/app";
// import { version as osVersion, platform } from "@tauri-apps/plugin-os";
import {App} from '@capacitor/app';
import { Device } from '@capacitor/device';
// import { authenticate } from "tauri-plugin-web-auth-api";
import { GenericOAuth2 } from "@capacitor-community/generic-oauth2";
import { storeRepository } from "../repositories/store";
import { apiClient } from "../utils/apiClient";
import { decodeJWT } from "../utils/jwt";

const JWT_SECRET = import.meta.env.VITE_AUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error("VITE_AUTH_SECRET environment variable is required");
}

export type Provider = 'google' | 'apple'

const API = import.meta.env.VITE_API_BASE
const REDIRECT = `${import.meta.env.VITE_DEEP_LINK_SCHEME}://auth/callback` // 例: aitarotchat://auth/callback

// 各プロバイダ固有値を 1 か所に集約
const PROVIDERS: Record<Provider, {
  authorizationBaseUrl: string
  scope: string
  clientId: string
  additionalParameters?: Record<string, string>
}> = {
  google: {
    authorizationBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'openid email profile',
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID!,
    additionalParameters: { access_type: 'offline', prompt: 'consent' }
  },
  apple: {
    authorizationBaseUrl: 'https://appleid.apple.com/auth/authorize',
    scope: 'name email',
    // Apple は “Service ID”（Web用 client_id）をアプリ側に置く（公開OK）
    clientId: import.meta.env.VITE_APPLE_SERVICE_ID!
  }
}

export class AuthService {
  private readonly KEYS = {
    DEVICE_ID: "deviceId",
    ACCESS_TOKEN: "accessToken",
    CLIENT_ID: "clientId",
    USER_ID: "userId",
  } as const;

  /**
   * デバイス登録 - 起動時に必ず実行
   */
  async registerDevice(): Promise<JWTPayload> {
    console.log("registerDevice:デバイス登録開始");

    // デバイスIDを取得（なければ新規作成してストア登録）
    const deviceId = await this.ensureDeviceId();
    console.log("デバイスID:", deviceId);

    // Tauriから情報取得
    const [platformName, osVersionStr, appVersionStr] = await Promise.all([
      Device.getInfo().then(info => info.platform),
      Device.getInfo().then(info => info.osVersion),
      App.getInfo().then(info => info.version),
    ]);

    console.log(
      `プラットフォーム: ${platformName}, OS: ${osVersionStr}, アプリ: ${appVersionStr}`
    );

    try {
      const result = await apiClient.post<{ token: string }>(
        "/api/native/device/register",
        {
          deviceId,
          platform: platformName,
          appVersion: appVersionStr,
          osVersion: osVersionStr,
          // pushToken は将来的に追加
        }
      );
      if (!result || "error" in result) {
        throw new Error("デバイス登録に失敗しました");
      }

      console.log("デバイス登録成功:", result);
      const { token } = result;
      const payload = await decodeJWT<JWTPayload>(token, JWT_SECRET);
      if (!payload || !payload.deviceId || payload.deviceId !== deviceId) {
        throw new Error("不正なトークンが返却されました");
      }

      // サーバーレスポンスに合わせて保存
      await storeRepository.set(this.KEYS.ACCESS_TOKEN, token);
      await storeRepository.set(this.KEYS.CLIENT_ID, payload.clientId);

      if (payload.user?.id) {
        await storeRepository.set(this.KEYS.USER_ID, payload.user.id);
      }

      return payload;
    } catch (error) {
      console.error("デバイス登録エラー:", error);
      throw error;
    }
  }

  /**
   * OAuth認証 - ユーザーとデバイスを紐付け
   */
  async signInWithWeb(provider: Provider): Promise<JWTPayload> {
    const baseUrl = import.meta.env.VITE_BFF_URL || "http://localhost:3000";
    const url = new URL("/auth/signin?isMobile=true", baseUrl).toString();
    const callbackScheme =
      import.meta.env.VITE_DEEP_LINK_SCHEME || "aitarotchat";
    console.log("🔐 Web認証開始:", url, callbackScheme);
    const p = PROVIDERS[provider];
    console.log("プロバイダ設定:", provider, p);

    try {
      const auth = await GenericOAuth2.authenticate({
        authorizationBaseUrl: p.authorizationBaseUrl,
        accessTokenEndpoint:  `${API}/api/oauth/token?provider=${provider}`, // ← サーバーは 1 本
        appId: p.clientId,
        redirectUrl: REDIRECT,
        scope: p.scope,
        pkceEnabled: true,
        ios: { responseType: 'code' },
        android: { responseType: 'code' },
        additionalParameters: p.additionalParameters
      })
      if (!auth || "error" in auth) {
        console.log("❌ 認証キャンセルまたはエラー:", auth);
        throw new Error("認証に失敗しました");
      }

      const deviceId = await this.getDeviceId();
      if (!deviceId) {
        throw new Error("デバイスIDが存在しません");
      }
      console.log("デバイスID:", deviceId);

      const { token } = auth;
      const payload = await decodeJWT<JWTPayload>(token, JWT_SECRET);
      if (
        !payload ||
        !payload.deviceId ||
        payload.deviceId !== deviceId ||
        !payload.user ||
        !payload.user.id
      ) {
        console.error("❌ JWTペイロードエラー:", payload);
        throw new Error("不正なトークンが返却されました");
      }
      console.log("Web認証・トークン取得成功:", payload);

      await storeRepository.set(this.KEYS.ACCESS_TOKEN, token);
      await storeRepository.set(this.KEYS.USER_ID, payload.user.id);

      return payload;
    } catch (error) {
      console.error("❌ Web認証エラー:", error);
      throw error;
    }
  }

  private async ensureDeviceId(): Promise<string> {
    console.log("ensureDeviceId:デバイスID確認");
    let deviceId = await storeRepository.get<string>(this.KEYS.DEVICE_ID);
    console.log("現在のデバイスID:", deviceId);

    if (!deviceId) {
      console.log("デバイスIDが存在しないため新規作成");
      deviceId = crypto.randomUUID();
      await storeRepository.set(this.KEYS.DEVICE_ID, deviceId);
    }

    return deviceId;
  }

  async getDeviceId(): Promise<string | null> {
    return await storeRepository.get<string>(this.KEYS.DEVICE_ID);
  }

  async getAccessToken(): Promise<string | null> {
    return await storeRepository.get<string>(this.KEYS.ACCESS_TOKEN);
  }

  async saveAccessToken(token: string): Promise<void> {
    await storeRepository.set(this.KEYS.ACCESS_TOKEN, token);
  }

  async getClientId(): Promise<string | null> {
    return await storeRepository.get<string>(this.KEYS.CLIENT_ID);
  }

  async getUserId(): Promise<string | null> {
    return await storeRepository.get<string>(this.KEYS.USER_ID);
  }

  async logout(): Promise<void> {
    await storeRepository.delete(this.KEYS.ACCESS_TOKEN);
    await storeRepository.delete(this.KEYS.CLIENT_ID);
    await storeRepository.delete(this.KEYS.USER_ID);
  }

  async isAuthenticated(): Promise<boolean> {
    const userId = await this.getUserId();
    return userId !== null;
  }
}

export const authService = new AuthService();
