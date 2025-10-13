import { CapacitorHttp, type HttpResponse } from "@capacitor/core";
import { authService } from "../services/auth";

const BFF_URL = import.meta.env.VITE_BFF_URL || "http://localhost:3000";

/**
 * API エラークラス
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
    this.method = "GET";
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
    // ✅ 毎回最新のトークンを取得（キャッシュなし）
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
      throw new ApiError(
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
