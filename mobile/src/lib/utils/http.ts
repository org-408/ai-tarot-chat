import { CapacitorHttp, type HttpResponse } from "@capacitor/core";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";

const BFF_URL = import.meta.env.VITE_BFF_URL || "http://localhost:3000";

type RequestConfig = {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  requiresAuth: boolean;
};

export class Http {
  private static readonly TOKEN_KEY = "access_token";
  /**
   * ✅ 内部: 共通リクエスト処理
   *
   * すべてのリクエストメソッドで使用される共通ロジック
   */
  static async executeRequest<T>(config: RequestConfig): Promise<T> {
    const { method, path } = config;

    logWithContext("info", `[ApiClient] ${method} request to: ${path}`, {
      config,
    });

    try {
      // リクエスト実行
      const response: HttpResponse = await this._fetch(config);
      logWithContext("info", "[ApiClient] Response status:", {
        status: response.status,
      });

      // レスポンス処理
      if (response.status < 200 || response.status >= 300) {
        if (response.status === 401 || response.status === 403) {
          // 認証エラー時のトークンリフレッシュ処理
          logWithContext(
            "warn",
            `[ApiClient] Authentication error ${response.status} on ${method} ${path}`,
            { response }
          );
          await this._refresh();

          const retryResponse: HttpResponse = await this._fetch(config);
          logWithContext("info", "[ApiClient] Retry Response status:", {
            status: retryResponse.status,
          });
          if (retryResponse.status >= 200 && retryResponse.status < 300) {
            logWithContext("info", "[ApiClient] Response data after retry:", {
              data: retryResponse.data,
            });
            return retryResponse.data as T;
          }
        }
        logWithContext("error", `[ApiClient] API Error ${response.status}`, {
          response,
        });
        throw new HttpError(
          response.status,
          `API Error ${response.status} ${method} ${path}`,
          response
        );
      }

      logWithContext("info", "[ApiClient] Response data:", {
        data: response.data,
      });
      return response.data as T;
    } catch (error) {
      // ネットワークエラーの変換
      if (error instanceof Error && !(error instanceof HttpError)) {
        logWithContext("info", "[ApiClient] Network/Request error:", { error });
        throw new HttpError(0, `Network error: ${error.message}`, undefined);
      }
      throw error;
    }
  }

  /**
   *  ✅ トークンリフレッシュ処理
   *
   * authService 用に refresh を公開
   * authService からの多重 _refresh 呼び出しを防ぐ
   * @returns 新しいアクセストークン
   */
  static async refresh(): Promise<string> {
    const response = await this._refresh();
    return response.data.token;
  }

  private static async _refresh(): Promise<HttpResponse> {
    logWithContext(
      "info",
      "[ApiClient] Attempting token refresh due to 401/403 response"
    );
    const config = {
      method: "POST",
      path: "/api/auth/refresh",
      requiresAuth: false,
    } as RequestConfig;
    try {
      const res = await this._fetch(config);
      if (res.status < 200 || res.status >= 300) {
        logWithContext(
          "error",
          `[ApiClient] Token refresh failed with status: ${res.status}`,
          { res }
        );
        throw new HttpError(
          res.status,
          `Token refresh failed with status: ${res.status}`,
          res
        );
      }
      logWithContext("info", "[ApiClient] Token refresh successful", { res });
      const { token } = res.data;
      await this.saveAccessToken(token);
      return res;
    } catch (error) {
      logWithContext("error", "[ApiClient] Token refresh failed:", { error });
      throw new HttpError(500, "Token refresh failed", undefined);
    }
  }

  private static async _fetch(config: RequestConfig): Promise<HttpResponse> {
    const { method, path, body, requiresAuth } = config;

    // url を BFF_URL と組み合わせて作成
    const url = `${BFF_URL}${path}`;

    // トークン取得（requiresAuthがtrueの場合のみ）
    const token = requiresAuth ? await this.getAccessToken() : null;
    console.log("[ApiClient] Using token:", token ? "[HIDDEN]" : "null");

    // ヘッダー構築
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response: HttpResponse =
      method === "GET"
        ? await CapacitorHttp.get({ url, headers })
        : await CapacitorHttp.post({ url, headers, data: body });

    return response;
  }

  private static async getAccessToken(): Promise<string | null> {
    return await storeRepository.get<string>(this.TOKEN_KEY);
  }

  private static async saveAccessToken(token: string): Promise<void> {
    await storeRepository.set(this.TOKEN_KEY, token);
  }
}

/**
 * ✅ 共通 HTTP エラークラス
 *
 * すべての HTTP エラーで使用される統一エラークラス
 * - status: HTTPステータスコード
 * - response: 元のレスポンスオブジェクト
 */
export class HttpError extends Error {
  public status: number;
  public response?: HttpResponse;

  constructor(status: number, message: string, response?: HttpResponse) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.response = response;
  }

  /**
   * ✅ ネットワークエラーかどうかを判定
   *
   * ネットワークエラーと判定する条件:
   * - ステータスコードが0（接続失敗）
   * - ステータスコードなし（タイムアウトなど）
   * - 500番台（サーバーエラー）
   */
  isNetworkError(): boolean {
    return !this.status || this.status === 0 || this.status >= 500;
  }

  /**
   * ✅ 認証エラーかどうかを判定
   */
  isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /**
   * ✅ サーバーエラーかどうかを判定
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * ✅ クライアントエラーかどうかを判定
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

/**
 * ✅ エラーがネットワークエラーかどうかを判定するユーティリティ関数
 *
 * HttpError以外のエラー（例: TypeError）もネットワークエラーとして扱う
 */
export function isNetworkError(error: unknown): boolean {
  // HttpError の場合
  if (error instanceof HttpError) {
    return error.isNetworkError();
  }

  // その他のエラーで、明らかにネットワーク関連の場合
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("connection") ||
      message.includes("fetch") ||
      message.includes("internet")
    );
  }

  return false;
}

/**
 * ✅ エラーが認証エラーかどうかを判定するユーティリティ関数
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof HttpError) {
    return error.isAuthError();
  }
  return false;
}
