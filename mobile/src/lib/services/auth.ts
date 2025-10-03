// mobile/src/services/auth.capacitor.ts
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Browser } from '@capacitor/browser';
import type { JWTPayload } from '../../../../shared/lib/types';
import { storeRepository } from '../repositories/store';
import { decodeJWT } from '../utils/jwt';

const JWT_SECRET = import.meta.env.VITE_AUTH_SECRET;
const BFF_URL = import.meta.env.VITE_BFF_URL || "http://localhost:3000";

export class AuthService {
  private readonly KEYS = {
    DEVICE_ID: "deviceId",
    ACCESS_TOKEN: "accessToken",
    CLIENT_ID: "clientId",
    USER_ID: "userId",
  } as const;

  /**
   * デバイス登録 - 起動時に実行
   */
  async registerDevice(): Promise<JWTPayload> {
    const deviceId = await this.ensureDeviceId();
    
    const [info, appInfo] = await Promise.all([
      Device.getInfo(),
      App.getInfo()
    ]);

    const response = await fetch(`${BFF_URL}/api/native/device/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        platform: info.platform,
        appVersion: appInfo.version,
        osVersion: info.osVersion,
      })
    });

    if (!response.ok) {
      throw new Error('デバイス登録に失敗しました');
    }

    const { token } = await response.json();
    const payload = await decodeJWT<JWTPayload>(token, JWT_SECRET);
    
    await storeRepository.set(this.KEYS.ACCESS_TOKEN, token);
    await storeRepository.set(this.KEYS.CLIENT_ID, payload.clientId);
    
    if (payload.user?.id) {
      await storeRepository.set(this.KEYS.USER_ID, payload.user.id);
    }

    return payload;
  }

  /**
   * OAuth認証 - Browser + Deep Link方式
   */
  async signInWithWeb(): Promise<JWTPayload> {
    const url = `${BFF_URL}/auth/signin?isMobile=true`;
    const callbackScheme = import.meta.env.VITE_DEEP_LINK_SCHEME || "aitarotchat";
    
    return new Promise(async (resolve, reject) => {
      // Deep Linkリスナー設定
      const listener = await App.addListener('appUrlOpen', async (event) => {
        console.log('appUrlOpen triggered:', event.url);
        
        // リスナー削除
        await listener.remove();
        
        // ブラウザを閉じる
        await Browser.close();
        
        try {
          const callbackUrl = new URL(event.url);
          const ticket = callbackUrl.searchParams.get("ticket");
          
          if (!ticket) {
            reject(new Error("認証トークンが取得できませんでした"));
            return;
          }

          const deviceId = await this.getDeviceId();
          if (!deviceId) {
            reject(new Error("デバイスIDが存在しません"));
            return;
          }

          // チケット交換
          const response = await fetch(`${BFF_URL}/api/native/auth/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket, deviceId })
          });

          if (!response.ok) {
            throw new Error('トークン交換に失敗しました');
          }

          const { token } = await response.json();
          const payload = await decodeJWT<JWTPayload>(token, JWT_SECRET);
          
          if (!payload.user?.id) {
            throw new Error('不正なトークンが返却されました');
          }
          
          await storeRepository.set(this.KEYS.ACCESS_TOKEN, token);
          await storeRepository.set(this.KEYS.USER_ID, payload.user.id);
          
          resolve(payload);
        } catch (error) {
          reject(error);
        }
      });
      
      // ブラウザでOAuth画面を開く
      await Browser.open({ 
        url,
        windowName: '_self'
      });
    });
  }

  private async ensureDeviceId(): Promise<string> {
    let deviceId = await storeRepository.get<string>(this.KEYS.DEVICE_ID);
    
    if (!deviceId) {
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