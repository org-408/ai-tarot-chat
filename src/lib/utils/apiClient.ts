import { authService } from "../services/auth";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // デフォルトは環境変数から
    this.baseUrl =
      baseUrl || import.meta.env.VITE_BFF_URL || "http://localhost:3000";
  }

  async get<T>(path: string): Promise<T> {
    const token = await authService.getAccessToken();

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const token = await authService.getAccessToken();

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async postWithoutAuth<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return await response.json();
  }
}

// シングルトンインスタンス（デフォルト環境変数使用）
export const apiClient = new ApiClient();
