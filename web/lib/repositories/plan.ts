import type { Plan, PlanChangeHistory } from "@/../../shared/lib/types";
import { BaseRepository } from "./base";

export class PlanRepository extends BaseRepository {
  // ==================== Plan ====================
  async createPlan(
    plan: Omit<
      Plan,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "users"
      | "spreads"
      | "planChangeHistories"
    >
  ): Promise<string> {
    const created = await this.db.plan.create({
      data: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        isActive: plan.isActive,
        features: plan.features,
        maxReadings: plan.maxReadings,
        maxCeltics: plan.maxCeltics,
        maxPersonal: plan.maxPersonal,
        hasPersonal: plan.hasPersonal,
        hasHistory: plan.hasHistory,
      },
    });

    return created.id;
  }

  async getPlanById(id: string): Promise<Plan | null> {
    return await this.db.plan.findUnique({
      where: { id },
    });
  }

  async getPlanByCode(code: string): Promise<Plan | null> {
    return await this.db.plan.findUnique({
      where: { code },
    });
  }

  async getAllPlans(): Promise<Plan[]> {
    return await this.db.plan.findMany({
      orderBy: { price: "asc" },
    });
  }

  async getActivePlans(): Promise<Plan[]> {
    return await this.db.plan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });
  }

  async updatePlan(
    id: string,
    updates: Partial<
      Omit<
        Plan,
        | "id"
        | "createdAt"
        | "updatedAt"
        | "users"
        | "spreads"
        | "planChangeHistories"
      >
    >
  ): Promise<void> {
    await this.db.plan.update({
      where: { id },
      data: updates,
    });
  }

  // ==================== PlanChangeHistory ====================
  async createPlanChangeHistory(
    history: Omit<PlanChangeHistory, "id" | "changedAt" | "user" | "plan">
  ): Promise<string> {
    const created = await this.db.planChangeHistory.create({
      data: {
        userId: history.userId,
        planId: history.planId,
      },
    });

    return created.id;
  }

  async getHistoryByUserId(userId: string): Promise<PlanChangeHistory[]> {
    return await this.db.planChangeHistory.findMany({
      where: { userId },
      orderBy: { changedAt: "desc" },
      include: { plan: true },
    });
  }
}

export const planRepository = new PlanRepository();
