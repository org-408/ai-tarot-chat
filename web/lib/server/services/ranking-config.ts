import { rankingConfigRepository } from "@/lib/server/repositories/ranking-config";

export class RankingConfigService {
  async get() {
    return rankingConfigRepository.get();
  }

  async setCollectionEnabled(enabled: boolean, updatedBy: string | null) {
    return rankingConfigRepository.update({ collectionEnabled: enabled }, updatedBy);
  }

  async setPublicEnabled(enabled: boolean, updatedBy: string | null) {
    return rankingConfigRepository.update({ publicEnabled: enabled }, updatedBy);
  }
}

export const rankingConfigService = new RankingConfigService();
