import { UsageStats } from "../../../shared/lib/types";
import { apiClient } from "../utils/apiClient";

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
  async changePlan(newPlanCode: string): Promise<boolean> {
    console.log("Changing client plan to:", newPlanCode);
    const success = await apiClient.post<{ success: boolean }>(
      "/api/plans/change",
      { code: newPlanCode }
    );
    console.log("Plan change response:", success);
    if (!success || "error" in success) {
      throw new Error("Failed to change plan");
    }
    return success.success;
  }
}

// シングルトンインスタンス
export const clientService = new ClientService();
