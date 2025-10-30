import type {
  Reading,
  ReadingInput,
  SaveReadingResponse,
  UsageStats,
} from "../../../../shared/lib/types";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";
import { apiClient } from "../utils/api-client";

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
        planCode: data.plan.code,
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
  ): Promise<{ success: boolean; usage: UsageStats }> {
    logWithContext("info", "[ClientService] Changing plan", {
      newPlanCode,
    });

    try {
      const result = await apiClient.post<{
        success: boolean;
        usage: UsageStats;
      }>("/api/clients/plan/change", { code: newPlanCode });

      const { success, usage } = result;
      const planCode = usage?.plan.code;

      if (!result || !success || !usage || "error" in result) {
        throw new Error("Failed to change plan");
      }

      if (newPlanCode !== planCode) {
        logWithContext("error", "[ClientService] Plan change mismatch", {
          expected: newPlanCode,
          actual: planCode,
        });
        throw new Error(
          `Plan change mismatch: expected ${newPlanCode}, got ${planCode}`
        );
      }

      return result;
    } catch (error) {
      logWithContext("error", "[ClientService] Failed to change plan", {
        newPlanCode,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================
  // Reading 関連
  // ============================================

  /**
   * 占い結果を保存する
   */
  async saveReading(newReading: ReadingInput): Promise<SaveReadingResponse> {
    logWithContext("info", "[ClientService] Saving new reading", {
      newReading,
    });

    try {
      const result = await apiClient.post<SaveReadingResponse>(
        "/api/clients/readings",
        newReading
      );

      logWithContext("info", "[ClientService] Reading saved", {
        usage: result.usage,
        reading: result.reading,
      });
      return result;
    } catch (error) {
      logWithContext("error", "[ClientService] Failed to save reading", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 占い履歴を取得する
   */
  async getReadingHistory(take?: number, skip?: number): Promise<Reading[]> {
    logWithContext("info", "[ClientService] Fetching reading history", {
      take,
      skip,
    });
    try {
      const readings = await apiClient.get<Reading[]>(
        "/api/clients/readings" + take && skip
          ? `?take=${take}&skip=${skip}`
          : !skip
          ? `?take=${take}`
          : ""
      );
      logWithContext("info", "[ClientService] Reading history fetched", {
        count: readings.length,
      });
      return readings;
    } catch (error) {
      logWithContext(
        "error",
        "[ClientService] Failed to fetch reading history",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
      throw error;
    }
  }
}

export const clientService = new ClientService();
