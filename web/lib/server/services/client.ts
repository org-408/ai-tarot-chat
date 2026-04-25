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

        logWithContext("info", "Client plan", { plan, clientId });

        // 日付確認
        logWithContext("info", "Client last reading date", {
          clientId,
          lastReadingDate: client.lastReadingDate,
        });
        logWithContext("info", "Client last personal reading date", {
          clientId,
          lastPersonalReadingDate: client.lastPersonalReadingDate,
        });
        // ✅ 修正: null は「未実施」として除外し、過去日付のものがあればリセット
        //    旧ロジックは null を isSameDayJST(undefined) で評価し「当日でない」と
        //    誤判定していたため、未実施の状態でも即リセットが走っていた
        // ✅ クイック・パーソナルのリセット要否を独立して判定（片方が今日でも消さない）
        const quickNeedsReset =
          client.lastReadingDate !== null && !isSameDayJST(client.lastReadingDate);
        const personalNeedsReset =
          client.lastPersonalReadingDate !== null &&
          !isSameDayJST(client.lastPersonalReadingDate);
        const needsReset = quickNeedsReset || personalNeedsReset;

        // 日付が変わっていればリセット
        if (needsReset) {
          logWithContext("info", "Resetting daily counts for client", {
            clientId: client.id,
            quickNeedsReset,
            personalNeedsReset,
          });
          // beforeリセット用に保存
          const beforeReadingsCount = client.dailyReadingsCount;
          const beforePersonalCount = client.dailyPersonalCount;
          logWithContext("info", "Before counts - Readings", {
            clientId: client.id,
            beforeReadingsCount,
          });
          logWithContext("info", "Before counts - Personal", {
            clientId: client.id,
            beforePersonalCount,
          });

          // clientのカウントリセット（stale な日付のカウンターのみ）
          client = await clientRepo.resetDailyCounts(client.id, {
            resetReadings: quickNeedsReset,
            resetPersonal: personalNeedsReset,
          });
          // reset履歴追加
          await clientRepo.createDailyResetHistory({
            client: { connect: { id: client.id } },
            date: new Date(),
            resetType,
            beforeReadingsCount,
            beforePersonalCount,
            afterReadingsCount: quickNeedsReset ? 0 : beforeReadingsCount,
            afterPersonalCount: personalNeedsReset ? 0 : beforePersonalCount,
          });
          logWithContext("info", "Daily counts reset completed for client", {
            clientId: client.id,
          });
        }

        logWithContext("info", "Daily readings count", {
          clientId,
          dailyReadingsCount: client.dailyReadingsCount,
        });
        logWithContext("info", "Daily personal count", {
          clientId,
          dailyPersonalCount: client.dailyPersonalCount,
        });

        return {
          plan,
          isRegistered: client.isRegistered,
          lastLoginAt: client.lastLoginAt,
          hasDailyReset: needsReset,
          dailyReadingsCount: client.dailyReadingsCount,
          dailyPersonalCount: client.dailyPersonalCount,
          remainingReadings: Math.max(
            0,
            plan.maxReadings - client.dailyReadingsCount
          ),
          remainingPersonal: Math.max(
            0,
            plan.maxPersonal - client.dailyPersonalCount
          ),
          lastReadingDate: client.lastReadingDate,
          lastPersonalReadingDate: client.lastPersonalReadingDate,
          quickOnboardedAt: client.quickOnboardedAt ?? null,
          personalOnboardedAt: client.personalOnboardedAt ?? null,
        };
      }
    );
  }

  async setOnboardingFlag(
    clientId: string,
    screen: "quick" | "personal",
    completed: boolean
  ): Promise<{ quickOnboardedAt: Date | null; personalOnboardedAt: Date | null }> {
    const field = screen === "quick" ? "quickOnboardedAt" : "personalOnboardedAt";
    const updated = await clientRepository.updateClient(clientId, {
      [field]: completed ? new Date() : null,
    });
    logWithContext("info", "[ClientService] Onboarding flag updated", {
      clientId,
      screen,
      completed,
    });
    return {
      quickOnboardedAt: updated.quickOnboardedAt ?? null,
      personalOnboardedAt: updated.personalOnboardedAt ?? null,
    };
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

  /**
   * Web ユーザー向け: userId に紐づく Client を取得、なければ既存のゲスト Client を
   * リンクまたは新規作成する。
   *
   * 優先順序:
   *   1. userId で既存 Client を検索 → あればそのまま返す
   *   2. email で Client を検索 → userId 未紐付けのゲスト Client があれば
   *      リンクする（GUEST プランなら FREE に昇格）
   *   3. 上記どれもなければ FREE プランで新規作成
   *
   * 背景: 従来 (1) → (3) のみだったため、
   * 既存ゲスト Client (例: モバイルから作成・email 未設定 / 旧サインインで
   * email 付きだが userId 未連携) が残っていると Client.email の @unique
   * 制約で createClient がサイレント失敗し、Client なしのままサインイン状態
   * になっていた。mobile 側の exchangeTicket と同じリンクロジックを Web にも
   * 入れて解消する。
   */
  async getOrCreateForWebUser(params: {
    userId: string;
    email?: string;
    name?: string;
    image?: string;
    provider?: string;
  }): Promise<NonNullable<Awaited<ReturnType<typeof clientRepository.getClientByUserId>>>> {
    const { userId, email, name, image, provider = "google" } = params;

    // (1) userId で検索
    const existing = await clientRepository.getClientByUserId(userId);
    if (existing) {
      logWithContext("info", "[ClientService] getOrCreateForWebUser: existing client found", {
        clientId: existing.id,
        userId,
      });
      return existing;
    }

    // (2) email で未リンクのゲスト Client を検索してリンク
    if (email) {
      const byEmail = await clientRepository.getClientByEmail(email);
      if (byEmail && !byEmail.userId) {
        const upgradedPlanCode =
          byEmail.plan?.code === "GUEST" ? "FREE" : byEmail.plan?.code;
        logWithContext("info", "[ClientService] getOrCreateForWebUser: linking guest client by email", {
          clientId: byEmail.id,
          userId,
          email,
          fromPlan: byEmail.plan?.code,
          toPlan: upgradedPlanCode,
        });
        const linked = await clientRepository.updateClient(byEmail.id, {
          user: { connect: { id: userId } },
          name: name ?? byEmail.name,
          image: image ?? byEmail.image,
          provider,
          isRegistered: true,
          lastLoginAt: new Date(),
          ...(upgradedPlanCode && upgradedPlanCode !== byEmail.plan?.code
            ? { plan: { connect: { code: upgradedPlanCode } } }
            : {}),
        });
        return linked;
      }
    }

    // (3) 新規作成
    logWithContext("info", "[ClientService] getOrCreateForWebUser: creating new client", { userId });

    const freePlan = await planRepository.getPlanByCode("FREE");
    if (!freePlan) {
      throw new Error("FREE plan not found");
    }

    const created = await clientRepository.createClient({
      user: { connect: { id: userId } },
      email,
      name,
      image,
      provider,
      plan: { connect: { id: freePlan.id } },
      isRegistered: true,
      lastLoginAt: new Date(),
    });

    logWithContext("info", "[ClientService] getOrCreateForWebUser: new client created", {
      clientId: created.id,
      userId,
    });

    return created;
  }

  async updateLoginDate(clientId: string): Promise<void> {
    await clientRepository.updateClient(clientId, {
      lastLoginAt: new Date(),
    });
  }

  /**
   * アカウント削除（soft delete）
   * GDPR / App Store / Google Play ポリシー対応
   */
  async deleteAccount(clientId: string): Promise<void> {
    await clientRepository.softDeleteClient(clientId);
    logWithContext("info", "Account soft-deleted", { clientId });
  }

  /**
   * 管理者によるプランの直接変更（planId指定、制限チェックなし）
   */
  async adminChangeClientPlan(clientId: string, planId: string): Promise<void> {
    await clientRepository.updateClient(clientId, {
      plan: { connect: { id: planId } },
    });
    logWithContext("info", "Admin changed client plan", { clientId, planId });
  }

  /**
   * Stripe カスタマーIDを保存
   */
  async updateStripeCustomerId(clientId: string, stripeCustomerId: string): Promise<void> {
    await clientRepository.updateClient(clientId, { stripeCustomerId });
  }

  async getDeviceById(deviceId: string) {
    return clientRepository.getDeviceById(deviceId);
  }

  async getDeviceByDeviceId(deviceId: string) {
    return clientRepository.getDeviceByDeviceId(deviceId);
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
        let dailyPersonalCount = 0;
        if (autoReason === "DOWNGRADE") {
          // ダウングレード時は新プランの上限に収まるように調整
          dailyReadingsCount = Math.min(
            client.dailyReadingsCount,
            newPlan.maxReadings
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
  ): Promise<{ readings: Reading[]; total: number }> {
    const [readings, total] = await Promise.all([
      readingRepository.getReadingsByClientId(clientId, take, skip),
      readingRepository.countByClientId(clientId),
    ]);
    return { readings, total };
  }

  async getReadingById(
    clientId: string,
    readingId: string
  ): Promise<Reading | null> {
    const reading = await readingRepository.getReadingById(readingId);
    if (!reading || reading.clientId !== clientId) return null;
    return reading;
  }

  async consumeReadingQuota(params: {
    clientId: string;
    isPersonalReading: boolean;
  }): Promise<UsageStats> {
    const { clientId, isPersonalReading } = params;

    return BaseRepository.transaction(
      { client: clientRepository },
      async ({ client: clientRepo }) => {
        const client = await clientRepo.getClientById(clientId);
        if (!client) throw new Error("Client not found");

        // plan は resetDailyCounts より前に取得する。
        // resetDailyCounts は include: { plan } なしで返すため、
        // client を上書きすると plan が null になりバグる。
        const plan = client.plan;
        if (!plan) {
          throw new Error("Plan not found");
        }

        // クイック・パーソナルのリセット要否を独立して判定
        // 両方まとめてリセットすると、片方のカウンターが今日の分なのに誤って消えてしまう
        const quickNeedsReset =
          client.lastReadingDate !== null && !isSameDayJST(client.lastReadingDate);
        const personalNeedsReset =
          client.lastPersonalReadingDate !== null &&
          !isSameDayJST(client.lastPersonalReadingDate);
        const needsReset = quickNeedsReset || personalNeedsReset;

        if (needsReset) {
          const beforeReadingsCount = client.dailyReadingsCount;
          const beforePersonalCount = client.dailyPersonalCount;

          await clientRepo.resetDailyCounts(client.id, {
            resetReadings: quickNeedsReset,
            resetPersonal: personalNeedsReset,
          });
          await clientRepo.createDailyResetHistory({
            client: { connect: { id: client.id } },
            date: new Date(),
            resetType: "CONSUME_READING_QUOTA",
            beforeReadingsCount,
            beforePersonalCount,
            afterReadingsCount: quickNeedsReset ? 0 : beforeReadingsCount,
            afterPersonalCount: personalNeedsReset ? 0 : beforePersonalCount,
          });
        }

        const quotaConfig = isPersonalReading
          ? {
              counterField: "dailyPersonalCount" as const,
              lastDateField: "lastPersonalReadingDate" as const,
              limit: plan.maxPersonal,
              message: "本日のパーソナル占いの回数上限に達しました。",
              phase: "personal-reading" as const,
            }
            : {
                counterField: "dailyReadingsCount" as const,
                lastDateField: "lastReadingDate" as const,
                limit: plan.maxReadings,
                message: "本日のクイック占い回数上限に達しました。",
                phase: "quick" as const,
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
          dailyReadingsCount: updatedClient.dailyReadingsCount,
          dailyPersonalCount: updatedClient.dailyPersonalCount,
        });

        return {
          plan: updatedClient.plan!,
          isRegistered: updatedClient.isRegistered,
          lastLoginAt: updatedClient.lastLoginAt,
          hasDailyReset: needsReset,
          dailyReadingsCount: updatedClient.dailyReadingsCount,
          dailyPersonalCount: updatedClient.dailyPersonalCount,
          remainingReadings: Math.max(
            0,
            updatedClient.plan!.maxReadings - updatedClient.dailyReadingsCount
          ),
          remainingPersonal: Math.max(
            0,
            updatedClient.plan!.maxPersonal - updatedClient.dailyPersonalCount
          ),
          lastReadingDate: updatedClient.lastReadingDate,
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
            dailyPersonalCount: targetClient.dailyPersonalCount,
            remainingReadings: Math.max(
              0,
              targetClient.plan.maxReadings - targetClient.dailyReadingsCount
            ),
            remainingPersonal: Math.max(
              0,
              targetClient.plan.maxPersonal - targetClient.dailyPersonalCount
            ),
            lastReadingDate: targetClient.lastReadingDate,
            lastPersonalReadingDate: targetClient.lastPersonalReadingDate,
          };
        };

        if (
          !clientId ||
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

        // クライアント取得（Reading は Client 所属が本質）
        const client = await clientRepo.getClientById(clientId);
        if (!client) {
          logWithContext("error", "Client not found", { clientId });
          throw new Error("Client not found");
        }

        // Device は optional。JWT の deviceId に対応する Device レコードがあれば
        // Reading に紐付けるが、無ければ紐付けずに保存する（Web ユーザー等）。
        let deviceId: string | null = null;
        if (payloadDeviceId) {
          const device = await clientRepo.getDeviceByDeviceId(payloadDeviceId);
          deviceId = device?.id ?? null;
        }

        logWithContext("info", "Fetched client", {
          clientId,
          deviceId,
          tarotist,
          category,
          spread,
          cards,
          chatMessages,
        });

        // deviceId をセットし直す(payload の deviceId=UUID と
        // Reading に入れる deviceId=Device.id は別物)。null なら紐付けなし。
        params.deviceId = deviceId ?? undefined;

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

        // クイック・パーソナルのリセット要否を独立して判定
        // 例: lastPersonalReadingDate が昨日でも、今日のクイック占いカウントは消してはいけない
        const quickNeedsReset =
          client.lastReadingDate !== null && !isSameDayJST(client.lastReadingDate);
        const personalNeedsReset =
          client.lastPersonalReadingDate !== null &&
          !isSameDayJST(client.lastPersonalReadingDate);
        const needsReset = quickNeedsReset || personalNeedsReset;

        const plan = client.plan;
        if (!plan) {
          throw new Error("Plan not found");
        }

        if (needsReset) {
          const beforeReadingsCount = client.dailyReadingsCount;
          const beforePersonalCount = client.dailyPersonalCount;

          await clientRepo.resetDailyCounts(client.id, {
            resetReadings: quickNeedsReset,
            resetPersonal: personalNeedsReset,
          });
          await clientRepo.createDailyResetHistory({
            client: { connect: { id: client.id } },
            date: new Date(),
            resetType: "SAVE_READING",
            beforeReadingsCount,
            beforePersonalCount,
            afterReadingsCount: quickNeedsReset ? 0 : beforeReadingsCount,
            afterPersonalCount: personalNeedsReset ? 0 : beforePersonalCount,
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
          : {
              counterField: "dailyReadingsCount" as const,
              lastDateField: "lastReadingDate" as const,
              limit: plan.maxReadings,
              message: "本日の占い回数上限に達しました。",
              phase: "quick" as const,
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

  /**
   * 管理者による利用回数の手動リセット
   */
  async adminResetUsage(params: {
    clientId: string;
    resetType: "READINGS" | "PERSONAL" | "ALL";
    adminEmail: string;
    reason?: string;
  }): Promise<UsageStats> {
    const { clientId, resetType, adminEmail, reason } = params;

    const client = await clientRepository.getClientById(clientId);
    if (!client) throw new Error("Client not found");

    const plan = client.plan;
    if (!plan) throw new Error("Plan not found");

    const beforeReadingsCount = client.dailyReadingsCount;
    const beforePersonalCount = client.dailyPersonalCount;

    const updateData: Record<string, number> = {};
    if (resetType === "READINGS" || resetType === "ALL") {
      updateData.dailyReadingsCount = 0;
    }
    if (resetType === "PERSONAL" || resetType === "ALL") {
      updateData.dailyPersonalCount = 0;
    }

    const updatedClient = await clientRepository.updateClient(clientId, updateData);

    await clientRepository.createAdminResetHistory({
      client: { connect: { id: clientId } },
      resetType,
      adminEmail,
      reason,
      beforeReadingsCount,
      beforePersonalCount,
      afterReadingsCount: updatedClient.dailyReadingsCount,
      afterPersonalCount: updatedClient.dailyPersonalCount,
    });

    return {
      plan,
      isRegistered: updatedClient.isRegistered,
      lastLoginAt: updatedClient.lastLoginAt,
      hasDailyReset: false,
      dailyReadingsCount: updatedClient.dailyReadingsCount,
      dailyPersonalCount: updatedClient.dailyPersonalCount,
      remainingReadings: Math.max(0, plan.maxReadings - updatedClient.dailyReadingsCount),
      remainingPersonal: Math.max(0, plan.maxPersonal - updatedClient.dailyPersonalCount),
      lastReadingDate: updatedClient.lastReadingDate,
      lastPersonalReadingDate: updatedClient.lastPersonalReadingDate,
    };
  }

}

export const clientService = new ClientService();
