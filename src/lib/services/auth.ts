import { authenticate } from "tauri-plugin-web-auth-api";
import { storeRepository } from "../repositories/store";

/**
 * 認証関連のビジネスロジック
 * DeviceID、JWT管理
 */
export class AuthService {
  private readonly KEYS = {
    DEVICE_ID: "deviceId",
    ACCESS_TOKEN: "accessToken",
    REFRESH_TOKEN: "refreshToken",
    USER_ID: "userId",
  } as const;

  async signInWithWeb(
    url: string = "http://localhost:3000",
    callbackScheme: string = "aitarotchat"
  ) {
    const authUrl = new URL("/auth/signin?isMobile=true", url).toString();
    console.log("Starting web authentication with URL:", authUrl);
    try {
      const result = await authenticate({
        url: authUrl,
        callbackScheme,
      });

      const callbackUrl = new URL(result.callbackUrl);
      const jwt = callbackUrl.searchParams.get("token");
      const userId = callbackUrl.searchParams.get("userId");

      if (!jwt) {
        throw new Error("認証トークンが取得できませんでした");
      }

      // JWTを保存
      // await this.saveAuthToken(jwt);

      // return {
      //   jwt,
      //   userId,
      //   success: true,
      // };
      console.log("認証成功:", { jwt, userId });
    } catch (error) {
      console.error("Web認証エラー:", error);
      throw error;
    }
  }

  /**
   * デバイスIDを取得（なければ生成）
   */
  async getDeviceId(): Promise<string> {
    let deviceId = await storeRepository.get<string>(this.KEYS.DEVICE_ID);

    if (!deviceId) {
      // UUIDv4生成
      deviceId = crypto.randomUUID();
      await storeRepository.set(this.KEYS.DEVICE_ID, deviceId);
    }

    return deviceId;
  }

  /**
   * トークンペアを保存
   */
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await storeRepository.setMany({
      [this.KEYS.ACCESS_TOKEN]: accessToken,
      [this.KEYS.REFRESH_TOKEN]: refreshToken,
    });
  }

  /**
   * アクセストークンを取得
   */
  async getAccessToken(): Promise<string | null> {
    return await storeRepository.get<string>(this.KEYS.ACCESS_TOKEN);
  }

  /**
   * リフレッシュトークンを取得
   */
  async getRefreshToken(): Promise<string | null> {
    return await storeRepository.get<string>(this.KEYS.REFRESH_TOKEN);
  }

  /**
   * ユーザーIDを保存
   */
  async setUserId(userId: string): Promise<void> {
    await storeRepository.set(this.KEYS.USER_ID, userId);
  }

  /**
   * ユーザーIDを取得
   */
  async getUserId(): Promise<string | null> {
    return await storeRepository.get<string>(this.KEYS.USER_ID);
  }

  /**
   * ログアウト（全認証情報削除）
   */
  async logout(): Promise<void> {
    await storeRepository.delete(this.KEYS.ACCESS_TOKEN);
    await storeRepository.delete(this.KEYS.REFRESH_TOKEN);
    await storeRepository.delete(this.KEYS.USER_ID);
    // deviceIdは保持（デバイス識別用）
  }

  /**
   * 認証状態チェック
   */
  async isAuthenticated(): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    return accessToken !== null;
  }

  /**
   * トークンリフレッシュが必要かチェック
   * （簡易的な実装、本格的にはJWTデコードして有効期限確認）
   */
  async needsRefresh(): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) return true;

    // TODO: JWT デコードして exp 確認
    // 仮実装：常にリフレッシュを試みる
    return true;
  }
}

// シングルトンインスタンス
export const authService = new AuthService();
