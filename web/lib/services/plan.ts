// services/plan.service.ts

import type { User } from "@/../shared/lib/types";
import { prisma } from "@/lib/repositories/database";
import { planRepository } from "@/lib/repositories/plan";
import { userRepository } from "@/lib/repositories/user";

export class PlanService {
  /**
   * プラン変更（アップグレード/ダウングレード）
   */
  async changePlan(userId: string, newPlanCode: string): Promise<User> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return await prisma.$transaction(async (tx) => {
      const user = await userRepository.getUserById(userId);
      if (!user) throw new Error("User not found");

      const newPlan = await planRepository.getPlanByCode(newPlanCode);
      if (!newPlan) throw new Error("Plan not found");

      // プラン変更履歴記録
      await planRepository.createPlanChangeHistory({
        userId,
        planId: newPlan.id,
      });

      // ユーザーのプラン更新
      await userRepository.updateUser(userId, {
        planId: newPlan.id,
      });

      const updated = await userRepository.getUserById(userId);
      if (!updated) throw new Error("Failed to update user");

      return updated;
    });
  }

  /**
   * プラン機能チェック
   */
  async checkFeatureAccess(
    userId: string,
    feature: "personal" | "history"
  ): Promise<boolean> {
    const user = await userRepository.getUserById(userId);
    if (!user) return false;

    const plan = await planRepository.getPlanById(user.planId);
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
