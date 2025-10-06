import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Browser } from '@capacitor/browser';
import type { JWTPayload } from '../../../../shared/lib/types';
import { storeRepository } from '../repositories/store';
import { decodeJWT } from '../utils/jwt';
import { apiClient } from '../utils/apiClient';


const JWT_SECRET = import.meta.env.VITE_AUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error("VITE_AUTH_SECRET environment variable is required");
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

    // Capacitorから情報取得
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
        "/api/device/register",
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

      console.log("デバイス登録完了:", payload);
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
      // Capacitor版のauthenticate実装
      const auth = await new Promise<{ callbackUrl: string }>((resolve, reject) => {
        App.addListener('appUrlOpen', async (event) => {
          await Browser.close();
          resolve({ callbackUrl: event.url });
        }).then(listener => {
          // ブラウザを開く
          Browser.open({ url, windowName: '_self' }).catch(reject);
          
          // タイムアウト設定（オプション）
          setTimeout(() => {
            listener.remove();
            reject(new Error("認証タイムアウト"));
          }, 120000); // 2分
        });
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
      }>("/api/auth/exchange", { ticket, deviceId });
      if (!result || "error" in result) {
        console.log("❌ チケット交換エラー:", result);
        throw new Error("トークン交換に失敗しました");
      }

      console.log("✅ JWT取得成功 result:", result);
      const { token } = result;
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
      console.log("ユーザー紐付け成功:", payload);

      await storeRepository.set(this.KEYS.ACCESS_TOKEN, token);
      await storeRepository.set(this.KEYS.USER_ID, payload.user.id);

      console.log("🔐 Web認証完了:", payload);
      return payload;
    } catch (error) {
      console.error("❌ Web認証エラー:", error);
      throw error;
    }
  }

  /**
   * トークン更新
   */
  async refreshToken(): Promise<JWTPayload> {
    try {
      console.log('[AuthService] Refreshing token');
      
      const response = await apiClient.post<{ token: string }>(
        '/api/auth/refresh'
      );
      
      // 新しいトークンを保存
      await storeRepository.set('accessToken', response.token);
      
      // デコードして返す
      const payload = await decodeJWT<JWTPayload>(
        response.token,
        JWT_SECRET
      );
      
      // デバイスID等も保存
      if (payload.deviceId) {
        await storeRepository.set('deviceId', payload.deviceId);
      }
      if (payload.clientId) {
        await storeRepository.set('clientId', payload.clientId);
      }
      if (payload.user?.id) {
        await storeRepository.set('userId', payload.user.id);
      }

      console.log('[AuthService] Token refresh successful:', payload);
      return payload;
    } catch (error) {
      console.error('[AuthService] Token refresh failed:', error);
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
}

export const authService = new AuthService();
