import type { Client, UsageStats } from "@/../shared/lib/types";
import { logWithContext } from "@/lib/server/logger/logger";
import {
  BaseRepository,
  clientRepository,
  planRepository,
} from "@/lib/server/repositories";
import { isSameDayJST } from "@/lib/utils/date";

export class ClientService {
  /**
   * 今日の残り回数取得
   */
  async getUsageAndReset(
    clientId: string,
    resetType: string = "USAGE_CHECK"
  ): Promise<UsageStats> {
    logWithContext("info", "Checking and resetting usage", {
      clientId,
      resetType,
    });

    // トランザクションで処理
    return BaseRepository.transaction(
      { client: clientRepository },
      async ({ client: clientRepo }) => {
        let client = await clientRepo.getClientById(clientId);
        if (!client) throw new Error("Client not found");
        logWithContext("info", "Fetched client", { client, clientId });

        const plan = client.plan;
        if (!plan) throw new Error("Plan not found");

        logWithContext("info", "Client plan", { plan });

        // 日付確認
        logWithContext("info", "Client last reading date", {
          lastReadingDate: client.lastReadingDate,
        });
        logWithContext("info", "Client last celtic reading date", {
          lastCelticReadingDate: client.lastCelticReadingDate,
        });
        logWithContext("info", "Client last personal reading date", {
          lastPersonalReadingDate: client.lastPersonalReadingDate,
        });
        const needsReset =
          [
            client.lastReadingDate,
            client.lastCelticReadingDate,
            client.lastPersonalReadingDate,
          ].filter((date) => !isSameDayJST(date || undefined)).length > 0 &&
          [
            client.lastReadingDate,
            client.lastCelticReadingDate,
            client.lastPersonalReadingDate,
          ].some((date) => date !== null);

        // 日付が変わっていればリセット
        if (needsReset) {
          logWithContext("info", "Resetting daily counts for client", {
            clientId: client.id,
          });
          // beforeリセット用に保存
          const beforeReadingsCount = client.dailyReadingsCount;
          const beforeCelticsCount = client.dailyCelticsCount;
          const beforePersonalCount = client.dailyPersonalCount;
          logWithContext("info", "Before counts - Readings", {
            beforeReadingsCount,
          });
          logWithContext("info", "Before counts - Celtics", {
            beforeCelticsCount,
          });
          logWithContext("info", "Before counts - Personal", {
            beforePersonalCount,
          });

          // clientのカウントリセット
          client = await clientRepo.resetDailyCounts(client.id);
          // reset履歴追加
          await clientRepo.createDailyResetHistory({
            client: { connect: { id: client.id } },
            date: new Date(),
            resetType,
            beforeReadingsCount,
            beforeCelticsCount,
            beforePersonalCount,
            afterCelticsCount: 0,
            afterPersonalCount: 0,
            afterReadingsCount: 0,
          });
          logWithContext("info", "Daily counts reset completed for client", {
            clientId: client.id,
          });
        }

        logWithContext("info", "Daily readings count", {
          dailyReadingsCount: client.dailyReadingsCount,
        });
        logWithContext("info", "Daily celtics count", {
          dailyCelticsCount: client.dailyCelticsCount,
        });
        logWithContext("info", "Daily personal count", {
          dailyPersonalCount: client.dailyPersonalCount,
        });

        // UsageStats組み立て
        return {
          plan,
          isRegistered: client.isRegistered,
          lastLoginAt: client.lastLoginAt,
          hasDailyReset: needsReset,
          dailyReadingsCount: client.dailyReadingsCount,
          dailyCelticsCount: client.dailyCelticsCount,
          dailyPersonalCount: client.dailyPersonalCount,
          remainingReadings: Math.max(
            0,
            plan.maxReadings - client.dailyReadingsCount
          ),
          remainingCeltics: Math.max(
            0,
            plan.maxCeltics - client.dailyCelticsCount
          ),
          remainingPersonal: Math.max(
            0,
            plan.maxPersonal - client.dailyPersonalCount
          ),
          lastReadingDate: client.lastReadingDate,
          lastCelticReadingDate: client.lastCelticReadingDate,
          lastPersonalReadingDate: client.lastPersonalReadingDate,
        };
      }
    );
  }

  async getClientById(clientId: string) {
    return clientRepository.getClientById(clientId);
  }

  async getClientByDeviceId(deviceId: string) {
    return clientRepository.getClientByDeviceId(deviceId);
  }

  async getClientByUserId(userId: string) {
    return clientRepository.getClientByUserId(userId);
  }

  async updateLoginDate(clientId: string): Promise<void> {
    await clientRepository.updateClient(clientId, {
      lastLoginAt: new Date(),
    });
  }

  async deleteClientByDeviceId(deviceId: string): Promise<void> {
    await clientRepository.hardDeleteClientByDeviceId(deviceId);
  }

  async getDeviceById(deviceId: string) {
    return clientRepository.getDeviceById(deviceId);
  }

  async updateDevice(
    deviceId: string,
    data: Partial<{
      platform: string;
      appVersion: string;
      osVersion: string;
      pushToken: string | null;
    }>
  ) {
    return clientRepository.updateDevice(deviceId, data);
  }

  /**
   * プラン変更（アップグレード/ダウングレード）
   */
  async changePlan(
    clientId: string,
    newPlanCode: string,
    reason: string | undefined = undefined
  ): Promise<Client> {
    return BaseRepository.transaction(
      { client: clientRepository, plan: planRepository },
      async ({ client: clientRepo, plan: planRepo }) => {
        const client = await clientRepo.getClientById(clientId);
        if (!client || !client.plan || !client.plan.isActive)
          throw new Error("Client not found");

        const newPlan = await planRepo.getPlanByCode(newPlanCode);
        if (!newPlan || !newPlan.isActive) throw new Error("Invalid plan code");

        // プラン変更理由の自動判定
        const autoReason =
          client.plan.no < newPlan.no
            ? "UPGRADE"
            : client.plan.no > newPlan.no
            ? "DOWNGRADE"
            : "SAME";
        if (autoReason === "SAME") {
          logWithContext("warn", "❌ 同一プランへの変更リクエスト", {
            clientId,
            newPlanCode,
          });
          throw new Error("You are already on this plan");
        }

        // 利用残数のチェック(アップグレード時はリセット)
        let dailyReadingsCount = 0;
        let dailyCelticsCount = 0;
        let dailyPersonalCount = 0;
        if (autoReason === "DOWNGRADE") {
          // ダウングレード時は新プランの上限に収まるように調整
          dailyReadingsCount = Math.min(
            client.dailyReadingsCount,
            newPlan.maxReadings
          );
          dailyCelticsCount = Math.min(
            client.dailyCelticsCount,
            newPlan.maxCeltics
          );
          dailyPersonalCount = Math.min(
            client.dailyPersonalCount,
            newPlan.maxPersonal
          );
        }

        try {
          // プラン変更履歴記録
          await planRepo.createPlanChangeHistory({
            client: { connect: { id: client.id } },
            fromPlan: { connect: { id: client.planId } },
            toPlan: { connect: { code: newPlanCode } },
            reason: reason || autoReason,
          });
        } catch (error) {
          logWithContext("error", "❌ プラン変更履歴の記録に失敗", {
            clientId,
            newPlanCode,
            error,
          });
        }

        try {
          // ユーザーのプラン更新
          return await clientRepo.updateClient(clientId, {
            plan: { connect: { code: newPlanCode } },
            dailyReadingsCount,
            dailyCelticsCount,
            dailyPersonalCount,
          });
        } catch (error) {
          logWithContext("error", "❌ クライアントのプラン更新に失敗", {
            clientId,
            newPlanCode,
            error,
          });
          throw error;
        }
      }
    );
  }

  async readingDone(clientId: string, category: string, spreadId: string) {
    logWithContext("info", "Marking reading as done", {
      clientId,
      category,
      spreadId,
    });

    // トランザクションで処理
    return BaseRepository.transaction(
      { client: clientRepository },
      async ({ client: clientRepo }) => {
        const client = await clientRepo.getClientById(clientId);
        if (!client) throw new Error("Client not found");
      }
    );
  }
}

export const clientService = new ClientService();
