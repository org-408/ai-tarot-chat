import type { Plan } from "@/../shared/lib/types";
import { planRepository } from "@/lib/repositories/plan";

export class PlanService {
  /**
   * プラン一覧取得
   */
  async getPlans(all: boolean = false): Promise<Plan[]> {
    return await planRepository.getAllPlans(all);
  }
}

export const planService = new PlanService();
