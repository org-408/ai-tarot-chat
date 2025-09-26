// services/plan.service.ts

import type { Client } from "@/../shared/lib/types";
import { clientRepository } from "@/lib/repositories/client";
import { prisma } from "@/lib/repositories/database";
import { planRepository } from "@/lib/repositories/plan";

export class PlanService {
  /**
   * プラン変更（アップグレード/ダウングレード）
   */
  async changePlan(clientId: string, newPlanCode: string): Promise<Client> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return await prisma.$transaction(async (tx) => {
      const client = await clientRepository.getClientById(clientId);
      if (!client) throw new Error("Client not found");

      const newPlan = await planRepository.getPlanByCode(newPlanCode);
      if (!newPlan) throw new Error("Plan not found");

      // プラン変更履歴記録
      await planRepository.createPlanChangeHistory({
        clientId,
        planId: newPlan.id,
      });

      // ユーザーのプラン更新
      await clientRepository.updateClient(clientId, {
        planId: newPlan.id,
      });

      const updated = await clientRepository.getClientById(clientId);
      if (!updated) throw new Error("Failed to update client");

      return updated;
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
