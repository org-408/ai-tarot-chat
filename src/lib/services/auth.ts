// lib/services/auth.ts
import { getVersion } from "@tauri-apps/api/app";
import { version as osVersion, platform } from "@tauri-apps/plugin-os";
import { authenticate } from "tauri-plugin-web-auth-api";
import { storeRepository } from "../repositories/store";
import { apiClient } from "../utils/apiClient";

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
  async registerDevice() {
    console.log("registerDevice:デバイス登録開始");

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
      const data = await apiClient.postWithoutAuth<{
        token: string;
        userId: string | null;
        client: {
          id: string;
          userId: string | null;
          isRegistered: boolean;
          plan: string;
          user?: { id: string; email: string };
        };
      }>("/api/native/device/register", {
        deviceId,
        platform: platformName,
        appVersion: appVersionStr,
        osVersion: osVersionStr,
        // pushToken は将来的に追加
      });

      console.log("デバイス登録成功:", data);

      // サーバーレスポンスに合わせて保存
      await storeRepository.set(this.KEYS.ACCESS_TOKEN, data.token);
      await storeRepository.set(this.KEYS.CLIENT_ID, data.client.id);

      if (data.client.userId) {
        await storeRepository.set(this.KEYS.USER_ID, data.client.userId);
      }

      return {
        accessToken: data.token,
        clientId: data.client.id,
        plan: data.client.plan,
        user: data.client.user,
      };
    } catch (error) {
      console.error("デバイス登録エラー:", error);
      throw error;
    }
  }

  /**
   * OAuth認証 - ユーザーとデバイスを紐付け
   */
  async signInWithWeb() {
    const baseUrl = import.meta.env.VITE_BFF_URL || "http://localhost:3000";
    const url = new URL("/auth/signin?isMobile=true", baseUrl).toString();
    const callbackScheme =
      import.meta.env.VITE_DEEP_LINK_SCHEME || "aitarotchat";
    console.log("🔐 Web認証開始:", url, callbackScheme);

    try {
      const result = await authenticate({
        url,
        callbackScheme,
      });

      const callbackUrl = new URL(result.callbackUrl);
      const ticket = callbackUrl.searchParams.get("ticket");

      if (!ticket) {
        throw new Error("認証トークンが取得できませんでした");
      }

      console.log("🎫 チケット取得成功");

      const { token: jwt, userId } = await apiClient.postWithoutAuth<{
        token: string;
        userId: string;
      }>("/api/native/exchange", { ticket });

      console.log("✅ JWT取得成功 (userId:", userId, ")");

      await storeRepository.set(this.KEYS.ACCESS_TOKEN, jwt);

      const deviceId = await this.getDeviceId();
      const linkData = await apiClient.postWithoutAuth(
        "/api/native/link-user",
        { deviceId, userId }
      );

      console.log("ユーザー紐付け成功:", linkData);

      await storeRepository.set(this.KEYS.USER_ID, userId);

      // デバイス情報を再取得
      const deviceData = await this.registerDevice();

      return {
        success: true,
        userId,
        plan: deviceData.plan,
        user: deviceData.user,
      };
    } catch (error) {
      console.error("❌ Web認証エラー:", error);
      throw error;
    }
  }

  async getSession() {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error("アクセストークンがありません");
    }

    return await apiClient.get("/api/native/session");
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
