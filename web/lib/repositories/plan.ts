import type { Plan, PlanChangeHistory } from "@/../shared/lib/types";
import { Prisma } from "@prisma/client";
import { BaseRepository } from "./base";

export class PlanRepository extends BaseRepository {
  // ==================== Plan ====================
  async createPlan(
    plan: Omit<
      Plan,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "clients"
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

  // all=true で非アクティブプランも含む
  async getAllPlans(all: boolean = false): Promise<Plan[]> {
    return await this.db.plan.findMany({
      where: { isActive: all ? undefined : true },
      orderBy: { no: "asc" },
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
        | "clients"
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
    data: Prisma.PlanChangeHistoryCreateInput
  ): Promise<PlanChangeHistory> {
    return await this.db.planChangeHistory.create({
      data,
    });
  }

  async getHistoryByClientId(clientId: string): Promise<PlanChangeHistory[]> {
    return await this.db.planChangeHistory.findMany({
      where: { clientId },
      orderBy: { changedAt: "desc" },
      include: { client: true, fromPlan: true, toPlan: true },
    });
  }
}

export const planRepository = new PlanRepository();
