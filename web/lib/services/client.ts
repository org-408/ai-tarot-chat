import type { UsageStats } from "@/../shared/lib/types";
import { logWithContext } from "@/lib/logger/logger";
import { BaseRepository } from "@/lib/repositories/base";
import { clientRepository } from "@/lib/repositories/client";
import { isSameDayJST } from "../utils/date";

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
        const planCode = plan.code;
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
          planCode,
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
