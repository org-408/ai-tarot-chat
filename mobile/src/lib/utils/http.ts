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
            `[ApiClient] Authentication error ${response.status} on ${method} ${path}`
          );
          // ✅ リフレッシュしたトークンを直接受け取り、リトライに渡す
          //    Preferences の再読み込みを避けることで、タイミング問題を排除
          const refreshedToken = await this._refresh();

          const retryResponse: HttpResponse = await this._fetch(
            config,
            refreshedToken
          );
          logWithContext("info", "[ApiClient] Retry Response status:", {
            status: retryResponse.status,
          });
          if (retryResponse.status >= 200 && retryResponse.status < 300) {
            logWithContext("info", "[ApiClient] Response data after retry:");
            return retryResponse.data as T;
          }
          // ✅ リトライも失敗した場合はリトライのステータスコードで HttpError をスロー
          logWithContext(
            "error",
            `[ApiClient] Retry also failed: ${retryResponse.status}`
          );
          throw new HttpError(
            retryResponse.status,
            `API Error ${retryResponse.status} ${method} ${path} (after token refresh)`,
            retryResponse
          );
        }
        logWithContext("error", `[ApiClient] API Error ${response.status}`);
        throw new HttpError(
          response.status,
          `API Error ${response.status} ${method} ${path}`,
          response
        );
      }

      logWithContext("info", "[ApiClient] Response success");
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
    return await this._refresh();
  }

  /**
   * ✅ 内部: トークンリフレッシュ処理
   * @returns 新しいアクセストークン文字列
   */
  private static async _refresh(): Promise<string> {
    logWithContext(
      "info",
      "[ApiClient] Attempting token refresh due to 401/403 response"
    );
    const config = {
      method: "POST",
      path: "/api/auth/refresh",
      requiresAuth: true, // ✅ 現在のトークンをBearerヘッダーで送信（サーバー側の検証に必要）
    } as RequestConfig;
    try {
      const res = await this._fetch(config);
      if (res.status < 200 || res.status >= 300) {
        logWithContext(
          "error",
          `[ApiClient] Token refresh failed with status: ${res.status}`
        );
        throw new HttpError(
          res.status,
          `Token refresh failed with status: ${res.status}`,
          res
        );
      }
      logWithContext("info", "[ApiClient] Token refresh successful");
      const { token } = res.data;
      await this.saveAccessToken(token);
      // ✅ リフレッシュしたトークンを直接返す（Preferences再読み込み不要）
      return token;
    } catch (error) {
      // ✅ HttpError はステータスコードを保持したままスロー
      //    （401 を 500 に上書きしない = authStore が 401 を正しく処理できる）
      if (error instanceof HttpError) {
        logWithContext(
          "error",
          `[ApiClient] Token refresh failed with status: ${error.status}`,
          { error }
        );
        throw error;
      }
      // ネットワーク障害など HttpError 以外は HttpError(500) にラップ
      logWithContext("error", "[ApiClient] Token refresh network error:", {
        error,
      });
      throw new HttpError(500, "Token refresh failed", undefined);
    }
  }

  /**
   * ✅ 内部: HTTPリクエスト実行
   * @param config リクエスト設定
   * @param explicitToken 明示的なトークン（リトライ時に refresh 後のトークンを直接渡すために使用）
   */
  private static async _fetch(
    config: RequestConfig,
    explicitToken?: string | null
  ): Promise<HttpResponse> {
    const { method, path, body, requiresAuth } = config;

    // url を BFF_URL と組み合わせて作成
    const url = `${BFF_URL}${path}`;

    // ✅ 明示的なトークンがあればそれを使用（リトライ時）
    //    なければ Preferences から取得（初回リクエスト時）
    const token =
      explicitToken !== undefined
        ? explicitToken
        : requiresAuth
          ? await this.getAccessToken()
          : null;

    logWithContext("info", "[ApiClient] Request prepared:", {
      method,
      path,
      hasToken: !!token,
      tokenSource: explicitToken !== undefined ? "explicit" : "storage",
    });

    // ✅ ヘッダー構築
    //    GETリクエストにはボディがないため Content-Type は不要
    //    iOS の URLSession が Content-Type のないリクエストを正しく処理するために除外
    const headers: Record<string, string> = {};
    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
    }
    if (token) {
      // ✅ POST: Authorization ヘッダーを使用（問題なし）
      // ✅ GET: Authorization + X-App-Token の両方を送信
      //    Cloudflare が GET リクエストの Authorization ヘッダーをキャッシュ用途でストリップ
      //    する場合があるため、カスタムヘッダー X-App-Token を併用する
      headers.Authorization = `Bearer ${token}`;
      if (method === "GET") {
        headers["X-App-Token"] = token;
      }
    }

    // ✅ GET は window.fetch() を使用
    //    iOS の CapacitorHttp.request({ method: "GET" }) はカスタムヘッダー（Authorization等）を
    //    ドロップする既知の問題がある。WKWebView の fetch() は CORS + カスタムヘッダーを正しく送信する。
    //    POST は引き続き CapacitorHttp.request() を使用（問題なし）。
    if (method === "GET") {
      const fetchResponse = await fetch(url, {
        method: "GET",
        headers,
      });

      const responseText = await fetchResponse.text();
      let data: unknown;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText || null;
      }

      const responseHeaders: Record<string, string> = {};
      fetchResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        data,
        status: fetchResponse.status,
        headers: responseHeaders,
        url,
      } as HttpResponse;
    }

    // POST: CapacitorHttp.request() を使用
    const response: HttpResponse = await CapacitorHttp.request({
      url,
      method,
      headers,
      data: body,
    });

    return response;
  }

  static async getAccessToken(): Promise<string | null> {
    return await storeRepository.get<string>(this.TOKEN_KEY);
  }

  static async saveAccessToken(token: string): Promise<void> {
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
