// lib/services/auth.ts
import type { JWTPayload } from "@/../shared/lib/types";
import { getVersion } from "@tauri-apps/api/app";
import { version as osVersion, platform } from "@tauri-apps/plugin-os";
import { authenticate } from "tauri-plugin-web-auth-api";
import { storeRepository } from "../repositories/store";
import { apiClient } from "../utils/apiClient";
import { decodeJWT } from "../utils/jwt";

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
      platform(),
      osVersion(),
      getVersion(),
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
      const secret = import.meta.env.VITE_AUTH_SECRET;
      const payload = await decodeJWT<JWTPayload>(token, secret);
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
  async signInWithWeb(): Promise<JWTPayload> {
    const baseUrl = import.meta.env.VITE_BFF_URL || "http://localhost:3000";
    const url = new URL("/auth/signin?isMobile=true", baseUrl).toString();
    const callbackScheme =
      import.meta.env.VITE_DEEP_LINK_SCHEME || "aitarotchat";
    console.log("🔐 Web認証開始:", url, callbackScheme);

    try {
      const auth = await authenticate({
        url,
        callbackScheme,
      });
      if (!auth || "error" in auth) {
        console.log("❌ 認証キャンセルまたはエラー:", auth);
        throw new Error("認証に失敗しました");
      }

      const callbackUrl = new URL(auth.callbackUrl);
      const ticket = callbackUrl.searchParams.get("ticket");

      if (!ticket) {
        throw new Error("認証トークンが取得できませんでした");
      }

      console.log("🎫 チケット取得成功");

      const deviceId = await this.getDeviceId();
      if (!deviceId) {
        throw new Error("デバイスIDが存在しません");
      }
      console.log("デバイスID:", deviceId);

      const result = await apiClient.post<{
        token: string;
      }>("/api/native/auth/exchange", { ticket, deviceId });
      if (!result || "error" in result) {
        console.log("❌ チケット交換エラー:", result);
        throw new Error("トークン交換に失敗しました");
      }

      console.log("✅ JWT取得成功 result:", result);
      const { token } = result;
      const secret = import.meta.env.VITE_AUTH_SECRET;
      const payload = await decodeJWT<JWTPayload>(token, secret);
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
      console.log("ユーザー紐付け成功:", payload);

      await storeRepository.set(this.KEYS.ACCESS_TOKEN, result.token);
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
