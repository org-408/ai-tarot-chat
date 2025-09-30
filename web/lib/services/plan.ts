// services/plan.service.ts

import type { Client } from "@/../shared/lib/types";
import { clientRepository } from "@/lib/repositories/client";
import { prisma } from "@/lib/repositories/database";
import { planRepository } from "@/lib/repositories/plan";

export class PlanService {
  /**
   * プラン変更（アップグレード/ダウングレード）
   */
  async changePlan(
    clientId: string,
    newPlanCode: string,
    reason: string | undefined = undefined
  ): Promise<Client> {
    return await prisma.$transaction(async (tx) => {
      const clientRepo = clientRepository.withTransaction(tx);
      const planRepo = planRepository.withTransaction(tx);

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
      if (autoReason === "SAME")
        throw new Error("You are already on this plan");

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

      // プラン変更履歴記録
      await planRepo.createPlanChangeHistory({
        client: { connect: { id: client.id } },
        fromPlan: { connect: { id: client.planId } },
        toPlan: { connect: { code: newPlanCode } },
        reason: reason || autoReason,
      });

      // ユーザーのプラン更新
      return await clientRepo.updateClient(clientId, {
        planId: newPlan.id,
        dailyReadingsCount,
        dailyCelticsCount,
        dailyPersonalCount,
      });
    });
  }

  /**
   * プラン機能チェック
   */
  async checkFeatureAccess(
    clientId: string,
    feature: "personal" | "history"
  ): Promise<boolean> {
    const client = await clientRepository.getClientById(clientId);
    if (!client) return false;

    const plan = await planRepository.getPlanById(client.planId);
    if (!plan) return false;

    switch (feature) {
      case "personal":
        return plan.hasPersonal;
      case "history":
        return plan.hasHistory;
      default:
        return false;
    }
  }
}

export const planService = new PlanService();
