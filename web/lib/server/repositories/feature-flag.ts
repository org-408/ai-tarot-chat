import { BaseRepository } from "./base";

export class FeatureFlagRepository extends BaseRepository {
  async list() {
    return this.db.featureFlag.findMany({ orderBy: { key: "asc" } });
  }

  async get(key: string) {
    return this.db.featureFlag.findUnique({ where: { key } });
  }

  async isEnabled(key: string): Promise<boolean> {
    const flag = await this.db.featureFlag.findUnique({ where: { key } });
    return flag?.enabled === true;
  }

  async upsert(
    key: string,
    enabled: boolean,
    opts: { description?: string | null; updatedBy?: string | null } = {}
  ) {
    return this.db.featureFlag.upsert({
      where: { key },
      update: {
        enabled,
        description: opts.description ?? undefined,
        updatedBy: opts.updatedBy ?? undefined,
      },
      create: {
        key,
        enabled,
        description: opts.description ?? null,
        updatedBy: opts.updatedBy ?? null,
      },
    });
  }
}

export const featureFlagRepository = new FeatureFlagRepository();
