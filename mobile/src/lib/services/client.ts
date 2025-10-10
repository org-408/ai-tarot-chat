import type { AppJWTPayload, UsageStats } from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";
import { apiClient } from "../utils/apiClient";
import { decodeJWT } from "../utils/jwt";

const JWT_SECRET = import.meta.env.VITE_AUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error("VITE_AUTH_SECRET environment variable is required");
}

const LAST_FETCHED_DATE_KEY = "usage_last_fetched_date";

/**
 * Client（ユーザー）に関する操作を管理
 * - Usage（利用状況）
 * - Plan（プラン変更）
 */
export class ClientService {
  // ============================================
  // Usage 関連
  // ============================================

  /**
   * 利用状況を取得 & 必要なら日次リセット
   * サーバー側で日付判定を行い、日が変わっていればリセットされる
   */
  async getUsageAndReset(): Promise<UsageStats> {
    logWithContext(
      "info",
      "[ClientService] Fetching usage stats (and reset if needed)"
    );

    try {
      const data = await apiClient.get<UsageStats>("/api/clients/usage");

      logWithContext("info", "[ClientService] Usage stats fetched", {
        planCode: data.planCode,
        remainingReadings: data.remainingReadings,
        remainingCeltics: data.remainingCeltics,
        remainingPersonal: data.remainingPersonal,
      });

      return data;
    } catch (error) {
      logWithContext("error", "[ClientService] Failed to fetch usage", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 最後に取得した日付を保存
   */
  async saveLastFetchedDate(date: string): Promise<void> {
    await storeRepository.set(LAST_FETCHED_DATE_KEY, date);
  }

  /**
   * 最後に取得した日付を取得
   */
  async getLastFetchedDate(): Promise<string | null> {
    return await storeRepository.get<string>(LAST_FETCHED_DATE_KEY);
  }

  // ============================================
  // Plan 関連
  // ============================================

  /**
   * プランを変更する
   */
  async changePlan(
    newPlanCode: string
  ): Promise<{ success: boolean; payload: AppJWTPayload }> {
    logWithContext("info", "[ClientService] Changing plan", {
      newPlanCode,
    });

    try {
      const result = await apiClient.post<{ success: boolean; token: string }>(
        "/api/plans/change",
        { code: newPlanCode }
      );

      const { success, token } = result;

      if (!result || !success || !token || "error" in result) {
        throw new Error("Failed to change plan");
      }

      // トークンをデコード
      const payload = await decodeJWT<AppJWTPayload>(token, JWT_SECRET);

      if (
        !payload ||
        !payload.deviceId ||
        !payload.clientId ||
        payload.t !== "app" ||
        !payload.planCode ||
        payload.planCode !== newPlanCode
      ) {
        throw new Error("Invalid JWT token received");
      }

      // アクセストークンを保存
      await storeRepository.set("accessToken", token);

      logWithContext("info", "[ClientService] Plan changed successfully", {
        newPlan: newPlanCode,
        clientId: payload.clientId,
      });

      return { success, payload };
    } catch (error) {
      logWithContext("error", "[ClientService] Failed to change plan", {
        newPlanCode,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export const clientService = new ClientService();
