import { CapacitorHttp, type HttpResponse } from '@capacitor/core';
import { authService } from '../services/auth';

const BFF_URL = import.meta.env.VITE_BFF_URL || "http://localhost:3000";

export class ApiClient {
  async get<T>(path: string): Promise<T> {
    const token = await authService.getAccessToken();

    const response: HttpResponse = await CapacitorHttp.get({
      url: `${BFF_URL}${path}`,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        "Content-Type": "application/json",
      },
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const token = await authService.getAccessToken();

    const response: HttpResponse = await CapacitorHttp.post({
      url: `${BFF_URL}${path}`,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        "Content-Type": "application/json",
      },
      data: body,
    });

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