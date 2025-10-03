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
    // リフレッシュ中は循環参照を防ぐためチェックをスキップ
    if (this.isRefreshing) {
      return await authService.getAccessToken();
    }
    
    const now = Date.now();
    
    // 前回チェックから60秒以内ならキャッシュを返す
    if (this.cachedToken && (now - this.lastCheckTime) < TOKEN_CHECK_INTERVAL) {
      return this.cachedToken;
    }
    
    const token = await authService.getAccessToken();
    
    if (!token) {
      this.cachedToken = null;
      this.lastCheckTime = now;
      return null;
    }
    
    try {
      const payload = await decodeJWT(token, JWT_SECRET);
      const isExpired = payload.exp && now >= payload.exp * 1000;
      
      if (isExpired) {
        console.log('[ApiClient] Token expired, refreshing...');
        this.isRefreshing = true;
        try {
          await authService.refreshToken();
          const newToken = await authService.getAccessToken();
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
    this.cachedToken = null;
    this.lastCheckTime = 0;
  }

  async get<T>(path: string): Promise<T> {
    return this.requestWithRetry<T>(async (token) =>
      CapacitorHttp.get({
        url: `${BFF_URL}${path}`,
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          "Content-Type": "application/json",
        },
      })
    );
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.requestWithRetry<T>(async (token) =>
      CapacitorHttp.post({
        url: `${BFF_URL}${path}`,
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          "Content-Type": "application/json",
        },
        data: body,
      })
    );
  }

  /**
   * リクエスト実行 + 401エラー時の自動リトライ
   */
  private async requestWithRetry<T>(
    requestFn: (token: string | null) => Promise<HttpResponse>,
    retried = false
  ): Promise<T> {
    const token = await this.ensureValidToken();
    const response = await requestFn(token);
    
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

  private handleResponse<T>(response: HttpResponse): T {
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`API Error ${response.status}`);
    }
    return response.data as T;
  }
}

export const apiClient = new ApiClient();