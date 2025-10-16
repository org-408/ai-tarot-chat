import { CapacitorHttp, type HttpResponse } from "@capacitor/core";
import { authService } from "../services/auth";

const BFF_URL = import.meta.env.VITE_BFF_URL || "http://localhost:3000";

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

export class ApiClient {
  private path?: string;
  private method?: string;

  /**
   * ✅ 改善: キャッシュを廃止
   *
   * 理由:
   * 1. キャッシュクリアを手動で呼ぶのは設計ミス
   * 2. authService が単一の真実の源（Single Source of Truth）
   * 3. 毎回ストレージから取得してもパフォーマンス影響は無視できる
   * 4. シンプル = バグが少ない
   */
  private async getToken(): Promise<string | null> {
    // ✅ 常に最新のトークンをストレージから取得
    return await authService.getAccessToken();
  }

  async get<T>(path: string): Promise<T> {
    console.log(`[ApiClient] GET request to: ${BFF_URL}${path}`);
    this.path = path;
    this.method = "GET";
    return this.request<T>(async (token) => {
      return CapacitorHttp.get({
        url: `${BFF_URL}${path}`,
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          "Content-Type": "application/json",
        },
      });
    });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    console.log(`[ApiClient] POST request to: ${BFF_URL}${path}`);
    this.path = path;
    this.method = "POST";
    return this.request<T>(async (token) => {
      return CapacitorHttp.post({
        url: `${BFF_URL}${path}`,
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          "Content-Type": "application/json",
        },
        data: body,
      });
    });
  }

  /**
   * リクエスト実行
   * ✅ 毎回最新のトークンを取得
   */
  private async request<T>(
    requestFn: (token: string | null) => Promise<HttpResponse>
  ): Promise<T> {
    try {
      // ✅ 毎回最新のトークンを取得（キャッシュなし）
      const token = await this.getToken();
      console.log("[ApiClient] Using token:", token ? "[HIDDEN]" : "null");

      const response = await requestFn(token);
      console.log("[ApiClient] Response status:", response.status);

      return this.handleResponse<T>(response);
    } catch (error) {
      // ✅ CapacitorHttpの例外を適切にHttpErrorに変換
      if (error instanceof Error && !(error instanceof HttpError)) {
        console.error("[ApiClient] Network/Request error:", error);
        // ネットワークエラーとしてステータス0で扱う
        throw new HttpError(0, `Network error: ${error.message}`, undefined);
      }
      throw error;
    }
  }

  // トークンなしGETリクエスト
  async getWithoutAuth<T>(path: string): Promise<T> {
    console.log(`[ApiClient] GET (without auth) request to: ${BFF_URL}${path}`);
    this.path = path;
    this.method = "GET";

    try {
      const response = await CapacitorHttp.get({
        url: `${BFF_URL}${path}`,
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("[ApiClient] Response status:", response.status);
      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error && !(error instanceof HttpError)) {
        console.error("[ApiClient] Network/Request error:", error);
        throw new HttpError(0, `Network error: ${error.message}`, undefined);
      }
      throw error;
    }
  }

  // トークンなしPOSTリクエスト
  async postWithoutAuth<T>(path: string, body?: unknown): Promise<T> {
    console.log(
      `[ApiClient] POST (without auth) request to: ${BFF_URL}${path}`
    );
    this.path = path;
    this.method = "POST";

    try {
      const response = await CapacitorHttp.post({
        url: `${BFF_URL}${path}`,
        headers: {
          "Content-Type": "application/json",
        },
        data: body,
      });
      console.log("[ApiClient] Response status:", response.status);
      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error && !(error instanceof HttpError)) {
        console.error("[ApiClient] Network/Request error:", error);
        throw new HttpError(0, `Network error: ${error.message}`, undefined);
      }
      throw error;
    }
  }

  private handleResponse<T>(response: HttpResponse): T {
    console.log("[ApiClient] handleResponse called, status:", response.status);
    if (response.status < 200 || response.status >= 300) {
      console.error(`[ApiClient] API Error ${response.status}`, response);
      throw new HttpError(
        response.status,
        `API Error ${response.status} ${this.method} ${this.path}`,
        response
      );
    }
    console.log("[ApiClient] Response data:", response.data);
    return response.data as T;
  }
}

export const apiClient = new ApiClient();
