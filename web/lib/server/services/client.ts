import type {
    Client,
    Reading,
    SaveReadingInput,
    SaveReadingResponse,
    UsageStats,
} from "@/../shared/lib/types";
import { logWithContext } from "@/lib/server/logger/logger";
import {
    BaseRepository,
    clientRepository,
    planRepository,
    readingRepository,
} from "@/lib/server/repositories";
import { ReadingRouteError } from "@/lib/server/utils/reading-error";
import { isSameDayJST } from "@/lib/utils/date";

const debugMode = process.env.AI_DEBUG_MODE === "true";

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
        // ✅ 修正: null は「未実施」として除外し、過去日付のものがあればリセット
        //    旧ロジックは null を isSameDayJST(undefined) で評価し「当日でない」と
        //    誤判定していたため、Celtic/Personal 未実施の状態でも即リセットが走っていた
        const needsReset = [
          client.lastReadingDate,
          client.lastCelticReadingDate,
          client.lastPersonalReadingDate,
        ].some((date) => date !== null && !isSameDayJST(date));

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

  /**
   * 占い履歴取得（ビジネスロジック）
   * 読み取り専用のため、トランザクションは不要
   * clientService に集約
   */
  async getReadingHistory(
    clientId: string,
    take = 20,
    skip = 0
  ): Promise<Reading[]> {
    const client = await clientRepository.getClientById(clientId);
    if (!client) throw new Error("Client not found");

    const plan = await planRepository.getPlanById(client.planId);
    if (!plan) throw new Error("Plan not found");

    // プランに履歴機能がない場合はエラー
    if (!plan.hasHistory) {
      throw new Error("History feature not available in current plan");
    }

    return await readingRepository.getReadingsByClientId(clientId, take, skip);
  }

  async consumeReadingQuota(params: {
    clientId: string;
    isPersonalReading: boolean;
    isCeltic: boolean;
  }): Promise<UsageStats> {
    const { clientId, isPersonalReading, isCeltic } = params;

    return BaseRepository.transaction(
      { client: clientRepository },
      async ({ client: clientRepo }) => {
        let client = await clientRepo.getClientById(clientId);
        if (!client) throw new Error("Client not found");

        const needsReset = [
          client.lastReadingDate,
          client.lastCelticReadingDate,
          client.lastPersonalReadingDate,
        ].some((date) => date !== null && !isSameDayJST(date));

        if (needsReset) {
          const beforeReadingsCount = client.dailyReadingsCount;
          const beforeCelticsCount = client.dailyCelticsCount;
          const beforePersonalCount = client.dailyPersonalCount;

          client = await clientRepo.resetDailyCounts(client.id);
          await clientRepo.createDailyResetHistory({
            client: { connect: { id: client.id } },
            date: new Date(),
            resetType: "CONSUME_READING_QUOTA",
            beforeReadingsCount,
            beforeCelticsCount,
            beforePersonalCount,
            afterCelticsCount: 0,
            afterPersonalCount: 0,
            afterReadingsCount: 0,
          });
        }

        const plan = client.plan;
        if (!plan) {
          throw new Error("Plan not found");
        }

        const quotaConfig = isPersonalReading
          ? {
              counterField: "dailyPersonalCount" as const,
              lastDateField: "lastPersonalReadingDate" as const,
              limit: plan.maxPersonal,
              message: "本日のパーソナル占いの回数上限に達しました。",
              phase: "personal-reading" as const,
            }
          : isCeltic
            ? {
                counterField: "dailyCelticsCount" as const,
                lastDateField: "lastCelticReadingDate" as const,
                limit: plan.maxCeltics,
                message: "本日のケルト十字占いの回数上限に達しました。",
                phase: "simple" as const,
              }
            : {
                counterField: "dailyReadingsCount" as const,
                lastDateField: "lastReadingDate" as const,
                limit: plan.maxReadings,
                message: "本日のシンプル占いの回数上限に達しました。",
                phase: "simple" as const,
              };

        const quotaConsumed = await clientRepo.incrementUsageIfWithinLimit({
          clientId,
          counterField: quotaConfig.counterField,
          lastDateField: quotaConfig.lastDateField,
          limit: quotaConfig.limit,
        });

        if (!quotaConsumed) {
          throw new ReadingRouteError({
            code: "LIMIT_REACHED",
            message: quotaConfig.message,
            status: 429,
            phase: quotaConfig.phase,
          });
        }

        const updatedClient = await clientRepo.getClientById(clientId);
        if (!updatedClient) {
          throw new Error("Client not found after usage update");
        }

        logWithContext("info", "Consumed reading quota", {
          clientId,
          isPersonalReading,
          isCeltic,
          dailyReadingsCount: updatedClient.dailyReadingsCount,
          dailyCelticsCount: updatedClient.dailyCelticsCount,
          dailyPersonalCount: updatedClient.dailyPersonalCount,
        });

        return {
          plan: updatedClient.plan!,
          isRegistered: updatedClient.isRegistered,
          lastLoginAt: updatedClient.lastLoginAt,
          hasDailyReset: needsReset,
          dailyReadingsCount: updatedClient.dailyReadingsCount,
          dailyCelticsCount: updatedClient.dailyCelticsCount,
          dailyPersonalCount: updatedClient.dailyPersonalCount,
          remainingReadings: Math.max(
            0,
            updatedClient.plan!.maxReadings - updatedClient.dailyReadingsCount
          ),
          remainingCeltics: Math.max(
            0,
            updatedClient.plan!.maxCeltics - updatedClient.dailyCelticsCount
          ),
          remainingPersonal: Math.max(
            0,
            updatedClient.plan!.maxPersonal - updatedClient.dailyPersonalCount
          ),
          lastReadingDate: updatedClient.lastReadingDate,
          lastCelticReadingDate: updatedClient.lastCelticReadingDate,
          lastPersonalReadingDate: updatedClient.lastPersonalReadingDate,
        };
      }
    );
  }

  /**
   *
   * @param clientId
   * @param category
   * @param spreadId
   * @returns
   */
  async saveReading(params: SaveReadingInput): Promise<SaveReadingResponse> {
    logWithContext("info", "Marking reading as done", {
      params,
    });
    // トランザクションで処理
    return BaseRepository.transaction(
      { client: clientRepository, reading: readingRepository },
      async ({ client: clientRepo, reading: ReadingRepo }) => {
        const {
          readingId,
          incrementUsage = true,
          clientId,
          deviceId: payloadDeviceId,
          tarotist,
          category,
          customQuestion,
          spread,
          cards,
          chatMessages,
        } = params;

        const buildUsage = (targetClient: Client): UsageStats => {
          if (!targetClient.plan) {
            throw new Error("Plan not found");
          }

          return {
            plan: targetClient.plan,
            isRegistered: targetClient.isRegistered,
            lastLoginAt: targetClient.lastLoginAt,
            hasDailyReset: false,
            dailyReadingsCount: targetClient.dailyReadingsCount,
            dailyCelticsCount: targetClient.dailyCelticsCount,
            dailyPersonalCount: targetClient.dailyPersonalCount,
            remainingReadings: Math.max(
              0,
              targetClient.plan.maxReadings - targetClient.dailyReadingsCount
            ),
            remainingCeltics: Math.max(
              0,
              targetClient.plan.maxCeltics - targetClient.dailyCelticsCount
            ),
            remainingPersonal: Math.max(
              0,
              targetClient.plan.maxPersonal - targetClient.dailyPersonalCount
            ),
            lastReadingDate: targetClient.lastReadingDate,
            lastCelticReadingDate: targetClient.lastCelticReadingDate,
            lastPersonalReadingDate: targetClient.lastPersonalReadingDate,
          };
        };

        if (
          !clientId ||
          !payloadDeviceId ||
          !tarotist ||
          (!category && !customQuestion) ||
          (category && customQuestion) ||
          !spread ||
          !cards ||
          !chatMessages
        ) {
          logWithContext("error", "Bad Request: missing parameters", {
            clientId,
            payloadDeviceId,
            tarotist,
            category,
            customQuestion,
            spread,
            cards,
            chatMessages,
          });
          throw new Error("Bad Request: missing parameters");
        }

        // クライアント取得
        const client = await clientRepo.getClientById(clientId);
        const device = await clientRepo.getDeviceByDeviceId(payloadDeviceId);
        if (!client || !device) {
          logWithContext("error", "Client or Device not found", {
            clientId,
            payloadDeviceId,
          });
          throw new Error("Client or Device not found");
        }
        const deviceId = device.id;

        logWithContext("info", "Fetched client", {
          clientId,
          deviceId,
          tarotist,
          category,
          spread,
          cards,
          chatMessages,
        });

        // deviceId をセットし直す(payload の deviceId とテーブルの deviceId は別物)
        params.deviceId = deviceId;

        // 占いタイプ判定
        if (!customQuestion && !category) {
          logWithContext(
            "error",
            "Either customQuestion or category must be provided",
            { clientId, tarotistId: tarotist.id, spreadCode: spread.code }
          );
          throw new Error("Either customQuestion or category must be provided");
        }
        const isPersonalReading =
          !!customQuestion && customQuestion.trim().length > 0;
        const isCeltic =
          !isPersonalReading && spread.code.toLowerCase().includes("celtic");

        const needsReset = [
          client.lastReadingDate,
          client.lastCelticReadingDate,
          client.lastPersonalReadingDate,
        ].some((date) => date !== null && !isSameDayJST(date));

        const plan = client.plan;
        if (!plan) {
          throw new Error("Plan not found");
        }

        if (needsReset) {
          const beforeReadingsCount = client.dailyReadingsCount;
          const beforeCelticsCount = client.dailyCelticsCount;
          const beforePersonalCount = client.dailyPersonalCount;

          await clientRepo.resetDailyCounts(client.id);
          await clientRepo.createDailyResetHistory({
            client: { connect: { id: client.id } },
            date: new Date(),
            resetType: "SAVE_READING",
            beforeReadingsCount,
            beforeCelticsCount,
            beforePersonalCount,
            afterCelticsCount: 0,
            afterPersonalCount: 0,
            afterReadingsCount: 0,
          });
        }

        let savedReading: Reading;

        if (readingId) {
          const existingReading = await ReadingRepo.getReadingById(readingId);
          if (!existingReading || existingReading.clientId !== clientId) {
            logWithContext("error", "Reading not found for update", {
              clientId,
              readingId,
            });
            throw new Error("Reading not found");
          }

          savedReading = await ReadingRepo.updateReading(readingId, params);
          logWithContext("info", "Updated existing reading", {
            clientId,
            readingId: savedReading.id,
          });

          const refreshedClient = await clientRepo.getClientById(clientId);
          if (!refreshedClient) {
            throw new Error("Client not found after reading update");
          }

          return {
            usage: buildUsage(refreshedClient),
            reading: savedReading,
          };
        }

        const quotaConfig = isPersonalReading
          ? {
              counterField: "dailyPersonalCount" as const,
              lastDateField: "lastPersonalReadingDate" as const,
              limit: plan.maxPersonal,
              message: "本日のパーソナル占いの回数上限に達しました。",
              phase: "personal-reading" as const,
            }
          : isCeltic
          ? {
              counterField: "dailyCelticsCount" as const,
              lastDateField: "lastCelticReadingDate" as const,
              limit: plan.maxCeltics,
              message: "本日のケルト十字占いの回数上限に達しました。",
              phase: "simple" as const,
            }
          : {
              counterField: "dailyReadingsCount" as const,
              lastDateField: "lastReadingDate" as const,
              limit: plan.maxReadings,
              message: "本日のシンプル占いの回数上限に達しました。",
              phase: "simple" as const,
            };

        let quotaConsumed = true;
        if (!incrementUsage) {
          quotaConsumed = true;
        } else if (isPersonalReading && debugMode) {
          await clientRepo.updateClient(clientId, {
            [quotaConfig.lastDateField]: new Date(),
          });
        } else {
          quotaConsumed = await clientRepo.incrementUsageIfWithinLimit({
            clientId,
            counterField: quotaConfig.counterField,
            lastDateField: quotaConfig.lastDateField,
            limit: quotaConfig.limit,
          });
        }

        if (!quotaConsumed) {
          throw new ReadingRouteError({
            code: "LIMIT_REACHED",
            message: quotaConfig.message,
            status: 429,
            phase: quotaConfig.phase,
          });
        }

        savedReading = await ReadingRepo.createReading(params);
        logWithContext("info", "Saved new reading", {
          readingId: savedReading.id,
        });

        const refreshedClient = await clientRepo.getClientById(clientId);
        if (!refreshedClient) {
          throw new Error("Client not found after saving reading");
        }

        const usage = buildUsage(refreshedClient);

        logWithContext("info", "Created new reading", {
          usage,
          reading: savedReading,
        });
        return {
          usage,
          reading: savedReading,
        };
      }
    );
  }
}

export const clientService = new ClientService();
