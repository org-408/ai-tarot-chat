import { AppJWTPayload, UsageStats } from "../../../shared/lib/types";
import { apiClient } from "../utils/apiClient";
import { decodeJWT } from "../utils/jwt";
import { authService } from "./auth";

/**
 * ユーザー情報の管理
 */
export class ClientService {
  /**
   * ユーザーの利用状況を取得
   */
  async getUsageAndReset(): Promise<UsageStats> {
    console.log("Fetching client usage stats...");
    const data = await apiClient.get<UsageStats>("/api/clients/usage");
    console.log("Client usage stats fetched:", data);
    if (!data || "error" in data) {
      throw new Error("Failed to fetch remaining readings");
    }
    return data;
  }

  /**
   * プランを変更する
   */
  async changePlan(
    newPlanCode: string
  ): Promise<{ success: boolean; payload: AppJWTPayload }> {
    console.log("Changing client plan to:", newPlanCode);
    const result = await apiClient.post<{ success: boolean; token: string }>(
      "/api/clients/plan/change",
      { code: newPlanCode }
    );
    const { success, token } = result;
    console.log("Plan change response:", success, token);
    if (!result || !success || !token || "error" in result) {
      throw new Error("Failed to change plan");
    }

    // トークンをデコードして新しいペイロードを取得
    const JWT_SECRET = import.meta.env.VITE_AUTH_SECRET;
    if (!JWT_SECRET) {
      throw new Error("VITE_AUTH_SECRET environment variable is required");
    }
    console.log("changePlan: Decoding new JWT token", JWT_SECRET);
    const payload = await decodeJWT<AppJWTPayload>(token, JWT_SECRET);
    if (
      !payload ||
      !payload.deviceId ||
      !payload.clientId ||
      payload.t !== "app" ||
      !payload.planCode ||
      !payload.user ||
      !payload.provider ||
      payload.planCode !== newPlanCode
    ) {
      throw new Error("Failed to decode new JWT token");
    }
    // ペイロードの検証成功
    console.log("New JWT payload decoded and verified:", payload);
    // アクセストークンを保存
    await authService.saveAccessToken(token);

    return { success, payload };
  }
}

// シングルトンインスタンス
export const clientService = new ClientService();
