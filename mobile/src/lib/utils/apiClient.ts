import { CapacitorHttp, type HttpResponse } from '@capacitor/core';
import { authService } from '../services/auth';
import { decodeJWT } from '../utils/jwt';

const BFF_URL = import.meta.env.VITE_BFF_URL || "http://localhost:3000";
const JWT_SECRET = import.meta.env.VITE_AUTH_SECRET;
const TOKEN_CHECK_INTERVAL = 60 * 1000; // 60秒ごとにチェック

export class ApiClient {
  private cachedToken: string | null = null;
  private lastCheckTime = 0;
  private isRefreshing = false;

  /**
   * トークンの有効性を確認し、期限切れなら自動更新
   */
  private async ensureValidToken(): Promise<string | null> {
    console.log('[ApiClient] ensureValidToken called');
    // リフレッシュ中は循環参照を防ぐためチェックをスキップ
    if (this.isRefreshing) {
      console.log('[ApiClient] Token is refreshing, skipping check');
      return await authService.getAccessToken();
    }
    
    const now = Date.now();
    console.log(`[ApiClient] Current time: ${now}, lastCheckTime: ${this.lastCheckTime}`);
    
    // 前回チェックから60秒以内ならキャッシュを返す
    if (this.cachedToken && (now - this.lastCheckTime) < TOKEN_CHECK_INTERVAL) {
      console.log('[ApiClient] Returning cached token');
      return this.cachedToken;
    }
    
    const token = await authService.getAccessToken();
    console.log('[ApiClient] Got token from authService:', token ? '[HIDDEN]' : 'null');
    
    if (!token) {
      console.log('[ApiClient] No token found');
      this.cachedToken = null;
      this.lastCheckTime = now;
      return null;
    }
    
    try {
      const payload = await decodeJWT(token, JWT_SECRET);
      console.log('[ApiClient] Decoded JWT payload:', payload);
      const isExpired = payload.exp && now >= payload.exp * 1000;
      console.log(`[ApiClient] Token expired? ${isExpired}`);
      
      if (isExpired) {
        console.log('[ApiClient] Token expired, refreshing...');
        this.isRefreshing = true;
        try {
          await authService.refreshToken();
          const newToken = await authService.getAccessToken();
          console.log('[ApiClient] Got new token after refresh:', newToken ? '[HIDDEN]' : 'null');
          this.cachedToken = newToken;
          this.lastCheckTime = now;
          return newToken;
        } finally {
          this.isRefreshing = false;
        }
      }
      
      this.cachedToken = token;
      this.lastCheckTime = now;
      return token;
    } catch (error) {
      console.error('[ApiClient] Token validation failed:', error);
      this.cachedToken = null;
      this.lastCheckTime = now;
      return null;
    }
  }

  /**
   * キャッシュクリア（logout時などに呼ぶ）
   */
  clearTokenCache(): void {
    console.log('[ApiClient] clearTokenCache called');
    this.cachedToken = null;
    this.lastCheckTime = 0;
  }

  async get<T>(path: string): Promise<T> {
    console.log(`[ApiClient] GET request to: ${BFF_URL}${path}`);
    return this.requestWithRetry<T>(async (token) => {
      console.log('[ApiClient] GET headers:', {
        ...(token && { Authorization: `Bearer [HIDDEN]` }),
        "Content-Type": "application/json",
      });
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
    console.log(`[ApiClient] POST request to: ${BFF_URL}${path}, body:`, body);
    return this.requestWithRetry<T>(async (token) => {
      console.log('[ApiClient] POST headers:', {
        ...(token && { Authorization: `Bearer [HIDDEN]` }),
        "Content-Type": "application/json",
      });
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
   * リクエスト実行 + 401エラー時の自動リトライ
   */
  private async requestWithRetry<T>(
    requestFn: (token: string | null) => Promise<HttpResponse>,
    retried = false
  ): Promise<T> {
    console.log(`[ApiClient] requestWithRetry called, retried: ${retried}`);
    const token = await this.ensureValidToken();
    console.log('[ApiClient] Using token:', token ? '[HIDDEN]' : 'null');
    const response = await requestFn(token);
    console.log('[ApiClient] Response status:', response.status);
    
    // 401エラーでまだリトライしていない場合
    if (response.status === 401 && !retried) {
      console.log('[ApiClient] 401 received, refreshing token and retrying...');
      this.isRefreshing = true;
      try {
        await authService.refreshToken();
        this.cachedToken = null; // キャッシュをクリアして次回ensureで新トークン取得
        return this.requestWithRetry<T>(requestFn, true);
      } finally {
        this.isRefreshing = false;
      }
    }
    
    return this.handleResponse<T>(response);
  }

  // 既存メソッドの修正: トークンなしGETリクエスト
  async getWithoutAuth<T>(path: string): Promise<T> {
    console.log(`[ApiClient] GET (without auth) request to: ${BFF_URL}${path}`);
    return this.requestWithoutAuth<T>(async () => {
      return CapacitorHttp.get({
        url: `${BFF_URL}${path}`,
        headers: {
          "Content-Type": "application/json",
        },
      });
    });
  }

  // 新規メソッド: トークンなしPOSTリクエスト
  async postWithoutAuth<T>(path: string, body?: unknown): Promise<T> {
    console.log(`[ApiClient] POST (without auth) request to: ${BFF_URL}${path}`);
    return this.requestWithoutAuth<T>(async () => {
      return CapacitorHttp.post({
        url: `${BFF_URL}${path}`,
        headers: {
          "Content-Type": "application/json",
        },
        data: body,
      });
    });
  }

  // 認証なしリクエスト処理（リトライなし）
  private async requestWithoutAuth<T>(
    requestFn: () => Promise<HttpResponse>
  ): Promise<T> {
    console.log(`[ApiClient] requestWithoutAuth called`);
    try {
      const response = await requestFn();
      console.log('[ApiClient] Response status:', response.status);
      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('[ApiClient] Request error:', error);
      throw error;
    }
  }
  
  private handleResponse<T>(response: HttpResponse): T {
    console.log('[ApiClient] handleResponse called, status:', response.status);
    if (response.status < 200 || response.status >= 300) {
      console.error(`[ApiClient] API Error ${response.status}`, response);
      throw new Error(`API Error ${response.status}`);
    }
    console.log('[ApiClient] Response data:', response.data);
    return response.data as T;
  }
}

export const apiClient = new ApiClient();