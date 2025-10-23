import { Http } from "./http";
export { HttpError, isAuthError, isNetworkError } from "./http";

export class ApiClient {
  /**
   * ✅ GET リクエスト（認証あり）
   */
  async get<T>(path: string): Promise<T> {
    return Http.executeRequest<T>({
      method: "GET",
      path,
      requiresAuth: true,
    });
  }

  /**
   * ✅ POST リクエスト（認証あり）
   */
  async post<T>(path: string, body?: unknown): Promise<T> {
    return Http.executeRequest<T>({
      method: "POST",
      path,
      body,
      requiresAuth: true,
    });
  }

  /**
   * ✅ GET リクエスト（認証なし）
   */
  async getWithoutAuth<T>(path: string): Promise<T> {
    return Http.executeRequest<T>({
      method: "GET",
      path,
      requiresAuth: false,
    });
  }

  /**
   * ✅ POST リクエスト（認証なし）
   */
  async postWithoutAuth<T>(path: string, body?: unknown): Promise<T> {
    return Http.executeRequest<T>({
      method: "POST",
      path,
      body,
      requiresAuth: false,
    });
  }
}

/**
 * ✅ エクスポート: シングルトンインスタンス
 *
 * 既存コードとの互換性を完全に保持
 */
export const apiClient = new ApiClient();
