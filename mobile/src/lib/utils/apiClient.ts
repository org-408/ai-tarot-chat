import { CapacitorHttp, type HttpResponse } from "@capacitor/core";
import { authService } from "../services/auth";

const BFF_URL = import.meta.env.VITE_BFF_URL || "http://localhost:3000";

/**
 * API エラークラス
 * status プロパティを持つエラーオブジェクト
 */
class ApiError extends Error {
  public status: number;
  public response?: HttpResponse;

  constructor(status: number, message: string, response?: HttpResponse) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.response = response;
  }
}

export class ApiClient {
  private cachedToken: string | null = null;

  /**
   * 現在のトークンを取得（シンプルにキャッシュから取るだけ）
   */
  private async getToken(): Promise<string | null> {
    // キャッシュがあればそれを返す
    if (this.cachedToken) {
      return this.cachedToken;
    }

    // なければストレージから取得してキャッシュ
    const token = await authService.getAccessToken();
    this.cachedToken = token;
    return token;
  }

  /**
   * キャッシュクリア（logout時、refresh後などに呼ぶ）
   */
  clearTokenCache(): void {
    console.log("[ApiClient] clearTokenCache called");
    this.cachedToken = null;
  }

  async get<T>(path: string): Promise<T> {
    console.log(`[ApiClient] GET request to: ${BFF_URL}${path}`);
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
   * シンプルなリクエスト実行（リトライなし）
   */
  private async request<T>(
    requestFn: (token: string | null) => Promise<HttpResponse>
  ): Promise<T> {
    const token = await this.getToken();
    console.log("[ApiClient] Using token:", token ? "[HIDDEN]" : "null");

    const response = await requestFn(token);
    console.log("[ApiClient] Response status:", response.status);

    return this.handleResponse<T>(response);
  }

  // トークンなしGETリクエスト
  async getWithoutAuth<T>(path: string): Promise<T> {
    console.log(`[ApiClient] GET (without auth) request to: ${BFF_URL}${path}`);
    const response = await CapacitorHttp.get({
      url: `${BFF_URL}${path}`,
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log("[ApiClient] Response status:", response.status);
    return this.handleResponse<T>(response);
  }

  // トークンなしPOSTリクエスト
  async postWithoutAuth<T>(path: string, body?: unknown): Promise<T> {
    console.log(
      `[ApiClient] POST (without auth) request to: ${BFF_URL}${path}`
    );
    const response = await CapacitorHttp.post({
      url: `${BFF_URL}${path}`,
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
    });
    console.log("[ApiClient] Response status:", response.status);
    return this.handleResponse<T>(response);
  }

  private handleResponse<T>(response: HttpResponse): T {
    console.log("[ApiClient] handleResponse called, status:", response.status);
    if (response.status < 200 || response.status >= 300) {
      console.error(`[ApiClient] API Error ${response.status}`, response);
      // ✅ status プロパティを持つエラーオブジェクトを throw
      throw new ApiError(
        response.status,
        `API Error ${response.status}`,
        response
      );
    }
    console.log("[ApiClient] Response data:", response.data);
    return response.data as T;
  }
}

export const apiClient = new ApiClient();
