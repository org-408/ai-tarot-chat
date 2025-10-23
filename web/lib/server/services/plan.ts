import type { Plan } from "@/../shared/lib/types";
import { planRepository } from "@/lib/server/repositories";

export class PlanService {
  /**
   * プラン一覧取得
   */
  async getPlans(all: boolean = false): Promise<Plan[]> {
    return await planRepository.getAllPlans(all);
  }
}

export const planService = new PlanService();
