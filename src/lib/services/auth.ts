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
    console.log("🔐 Web認証開始:", authUrl);

    try {
      // 1. Web認証でチケット取得
      const result = await authenticate({
        url: authUrl,
        callbackScheme,
      });

      const callbackUrl = new URL(result.callbackUrl);
      const ticket = callbackUrl.searchParams.get("ticket");

      if (!ticket) {
        throw new Error("認証トークンが取得できませんでした");
      }

      console.log("🎫 チケット取得成功");

      // 2. チケットをJWTに交換
      const exchangeUrl = new URL("/api/native/exchange", url).toString();
      console.log("🔄 JWT交換リクエスト:", exchangeUrl);

      const exchangeResponse = await fetch(exchangeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticket }),
      });

      if (!exchangeResponse.ok) {
        throw new Error(`JWT交換失敗: ${exchangeResponse.status}`);
      }

      const { token: jwt, userId } = await exchangeResponse.json();
      console.log("✅ JWT取得成功 (userId:", userId, ")");

      // 3. JWT と userId を保存
      await storeRepository.set(this.KEYS.ACCESS_TOKEN, jwt);
      await storeRepository.set(this.KEYS.USER_ID, userId);

      return {
        success: true,
        jwt,
        userId,
      };
    } catch (error) {
      console.error("❌ Web認証エラー:", error);
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
