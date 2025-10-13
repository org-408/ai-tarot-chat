import type { Client, Plan } from "@/../shared/lib/types";
import { BaseRepository } from "@/lib/repositories/base";
import { clientRepository } from "@/lib/repositories/client";
import { planRepository } from "@/lib/repositories/plan";
import { logWithContext } from "../logger/logger";

export class PlanService {
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
   * プラン一覧取得
   */
  async getPlans(all: boolean = false): Promise<Plan[]> {
    return await planRepository.getAllPlans(all);
  }
}

export const planService = new PlanService();
