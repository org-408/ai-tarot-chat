import { BaseRepository } from "./base";

/**
 * RankingConfig は singleton（id = "singleton"）。
 * マイグレーションで初期レコードを投入しているが、safety のため upsert で get する。
 */
export class RankingConfigRepository extends BaseRepository {
  private static readonly ID = "singleton";

  async get() {
    const existing = await this.db.rankingConfig.findUnique({
      where: { id: RankingConfigRepository.ID },
    });
    if (existing) return existing;
    return this.db.rankingConfig.create({
      data: { id: RankingConfigRepository.ID },
    });
  }

  async update(
    patch: { collectionEnabled?: boolean; publicEnabled?: boolean },
    updatedBy: string | null
  ) {
    return this.db.rankingConfig.upsert({
      where: { id: RankingConfigRepository.ID },
      update: { ...patch, updatedBy: updatedBy ?? undefined },
      create: { id: RankingConfigRepository.ID, ...patch, updatedBy },
    });
  }
}

export const rankingConfigRepository = new RankingConfigRepository();
