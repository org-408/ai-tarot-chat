import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import type { PluginListenerHandle } from "@capacitor/core";
import { Device } from "@capacitor/device";
import type { AppJWTPayload } from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";
import { apiClient } from "../utils/apiClient";
import { decodeJWT } from "../utils/jwt";

const JWT_SECRET = import.meta.env.VITE_AUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error("VITE_AUTH_SECRET environment variable is required");
}

export class AuthService {
  private readonly TOKEN_KEY = "access_token";
  private readonly DEVICE_ID_KEY = "device_id";
  // ============================================
  // 公開メソッド: Zustand Store から呼ばれる
  // ============================================

  /**
   * 保存済みトークン情報を取得
   * Store の init() から呼ばれる
   */
  async getStoredPayload(): Promise<{
    token: string | null;
    deviceId: string | null;
    clientId: string | null;
    userId: string | null;
  }> {
    const token = await storeRepository.get<string>(this.TOKEN_KEY);
    const payload = await this.decodeAccessToken(token || "");
    const { deviceId, clientId, user } = payload;
    const userId = user?.id || null;

    return { token, deviceId, clientId, userId };
  }

  /**
   * トークンをデコードしてペイロードを返す
   */
  async decodeStoredToken(token: string): Promise<AppJWTPayload> {
    return await decodeJWT<AppJWTPayload>(token, JWT_SECRET);
  }

  /**
   * トークンの有効期限をチェック
   */
  isTokenExpired(payload: AppJWTPayload): boolean {
    if (!payload.exp) {
      return true;
    }
    return Date.now() >= payload.exp * 1000;
  }

  // ============================================
  // 認証フロー
  // ============================================

  /**
   * デバイス登録 - 起動時に必ず実行
   */
  async registerDevice(): Promise<AppJWTPayload> {
    logWithContext("info", "[AuthService] Device registration started");

    try {
      // デバイスIDを取得(なければ新規作成してストア登録)
      const deviceId = await this.ensureDeviceId();

      // Capacitorから情報取得
      const [platformName, osVersionStr, appVersionStr] = await Promise.all([
        Device.getInfo().then((info) => info.platform),
        Device.getInfo().then((info) => info.osVersion),
        App.getInfo().then((info) => info.version),
      ]);

      // ✅ トークンなしで呼ぶ (デバイス登録は認証前の処理)
      const result = await apiClient.postWithoutAuth<{ token: string }>(
        "/api/device/register",
        {
          deviceId,
          platform: platformName,
          appVersion: appVersionStr,
          osVersion: osVersionStr,
        }
      );

      if (!result || "error" in result) {
        throw new Error("デバイス登録に失敗しました");
      }

      const { token } = result;
      const payload = await this.decodeAccessToken(token);

      logWithContext("info", "[AuthService] Device registration successful", {
        clientId: payload.clientId,
        platform: platformName,
      });

      return payload;
    } catch (error) {
      logWithContext("error", "[AuthService] Device registration failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * OAuth認証 - ユーザーとデバイスを紐付け
   */
  async signInWithWeb(): Promise<AppJWTPayload> {
    logWithContext("info", "[AuthService] OAuth signin started");

    const baseUrl = import.meta.env.VITE_BFF_URL || "http://localhost:3000";
    const url = new URL("/auth/signin?isMobile=true", baseUrl).toString();

    // Deep link の scheme（capacitor.config.ts と一致させる）
    const callbackScheme =
      import.meta.env.VITE_DEEP_LINK_SCHEME || "aitarotchat";

    logWithContext("info", "[AuthService] Opening browser for OAuth", {
      url,
      callbackScheme,
    });

    try {
      const auth = await new Promise<{ callbackUrl: string }>(
        (resolve, reject) => {
          let isResolved = false; // フラグ：既にresolve済みかどうか
          let appUrlListener: PluginListenerHandle | null = null;
          let browserFinishedListener: PluginListenerHandle | null = null;
          let timeoutId: ReturnType<typeof setTimeout> | null = null;

          // リスナーを全てクリーンアップする関数
          const cleanup = () => {
            if (appUrlListener) {
              appUrlListener.remove();
              appUrlListener = null;
            }
            if (browserFinishedListener) {
              browserFinishedListener.remove();
              browserFinishedListener = null;
            }
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
          };

          // appUrlOpen リスナー（deep link受信）
          App.addListener("appUrlOpen", async (event) => {
            if (isResolved) return; // 既に解決済みならスキップ

            // ✅ Scheme チェック（セキュリティ）
            if (!event.url.startsWith(`${callbackScheme}://`)) {
              logWithContext("warn", "[AuthService] Invalid callback scheme", {
                expected: callbackScheme,
                received: event.url,
              });
              isResolved = true;
              cleanup();
              reject(new Error("不正なコールバックURLです"));
              return;
            }

            // ✅ 正常な deep link として記録
            logWithContext("info", "[AuthService] Valid deep link received", {
              scheme: callbackScheme,
            });

            isResolved = true;
            cleanup();
            await Browser.close();
            resolve({ callbackUrl: event.url });
          }).then((listener) => {
            appUrlListener = listener;
          });

          // browserFinished リスナー（ブラウザが閉じられた）
          Browser.addListener("browserFinished", () => {
            if (isResolved) return; // 既にresolve済みなら何もしない

            logWithContext(
              "info",
              "[AuthService] Browser closed before deep link"
            );

            isResolved = true;
            cleanup();
            reject(new Error("ユーザーが認証をキャンセルしました"));
          }).then((listener) => {
            browserFinishedListener = listener;
          });

          // タイムアウト
          timeoutId = setTimeout(() => {
            if (isResolved) return;

            logWithContext("warn", "[AuthService] OAuth timeout");

            isResolved = true;
            cleanup();
            reject(new Error("認証タイムアウト"));
          }, 120000);

          // ブラウザを開く
          Browser.open({ url, windowName: "_self" }).catch((error) => {
            if (isResolved) return;

            isResolved = true;
            cleanup();
            reject(error);
          });
        }
      );

      if (!auth || "error" in auth) {
        throw new Error("認証に失敗しました");
      }

      const callbackUrl = new URL(auth.callbackUrl);
      const ticket = callbackUrl.searchParams.get("ticket");

      if (!ticket) {
        throw new Error("認証トークンが取得できませんでした");
      }

      const deviceId = await this.getDeviceId();
      if (!deviceId) {
        throw new Error("デバイスIDが存在しません");
      }

      const result = await apiClient.post<{ token: string }>(
        "/api/auth/exchange",
        { ticket, deviceId }
      );

      if (!result || "error" in result) {
        throw new Error("トークン交換に失敗しました");
      }

      const { token } = result;
      const payload = await this.decodeAccessToken(token);

      if (
        !payload ||
        !payload.deviceId ||
        payload.deviceId !== deviceId ||
        !payload.user ||
        !payload.user.id
      ) {
        throw new Error("不正なトークンが返却されました");
      }

      logWithContext("info", "[AuthService] OAuth signin successful", {
        clientId: payload.clientId,
        userId: payload.user.id,
        provider: payload.provider,
        payload,
      });

      return payload;
    } catch (error) {
      logWithContext("error", "[AuthService] OAuth signin failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * トークン更新
   */
  async refreshToken(): Promise<AppJWTPayload> {
    logWithContext("info", "[AuthService] Token refresh started");

    try {
      const { token } = await apiClient.post<{ token: string }>(
        "/api/auth/refresh"
      );

      const payload = await this.decodeAccessToken(token);

      logWithContext("info", "[AuthService] Token refresh successful", {
        clientId: payload.clientId,
      });

      return payload;
    } catch (error) {
      logWithContext("error", "[AuthService] Token refresh failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * ログアウト
   */
  async logout(): Promise<AppJWTPayload> {
    logWithContext("info", "[AuthService] Logout started");

    try {
      // サーバー側のセッションも終了させる
      const { token } = await apiClient.post<{ token: string }>(
        "/api/auth/signout",
        {}
      );

      const payload = await this.decodeAccessToken(token);
      logWithContext("info", "[AuthService] Server signout successful", {
        clientId: payload.clientId,
      });
      logWithContext("info", "[AuthService] Logout successful");
      return payload;
    } catch (error) {
      // サーバー側の失敗は基本的にデバイスIDが null のみなので、registerDevice からやり直し
      logWithContext("error", "[AuthService] Logout failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      logWithContext(
        "warn",
        "[AuthService] Device re-registered after signout failure"
      );
      // registerDevice からやり直し(エラーはそちらの関数に任せる)
      return await this.registerDevice();
    }
  }

  // ============================================
  // プライベートメソッド
  // ============================================

  private async ensureDeviceId(): Promise<string> {
    let deviceId = await storeRepository.get<string>(this.DEVICE_ID_KEY);

    if (!deviceId) {
      deviceId = crypto.randomUUID();
      await storeRepository.set(this.DEVICE_ID_KEY, deviceId);
      logWithContext("info", "[AuthService] New device ID created");
    }

    return deviceId;
  }

  async getDeviceId(): Promise<string | null> {
    return await storeRepository.get<string>(this.DEVICE_ID_KEY);
  }

  async decodeAccessToken(token: string): Promise<AppJWTPayload> {
    const payload = await decodeJWT<AppJWTPayload>(token, JWT_SECRET);

    if (!payload || !payload.deviceId) {
      throw new Error("不正なトークンが返却されました");
    }

    return payload;
  }
}

export const authService = new AuthService();
