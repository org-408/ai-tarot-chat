import type { MasterConfig } from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class MasterConfigRepository extends BaseRepository {
  async createMasterConfig(
    data: Omit<MasterConfig, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const created = await this.db.masterConfig.create({
      data: {
        key: data.key || "MASTER_VERSION",
        version: data.version,
        description: data.description || null,
      },
    });

    return created.id;
  }

  async getLatestMasterConfig(): Promise<MasterConfig | null> {
    return await this.db.masterConfig.findFirst({
      orderBy: { createdAt: "desc" },
    });
  }

  async getMasterConfigByKey(key: string): Promise<MasterConfig | null> {
    return await this.db.masterConfig.findFirst({
      where: { key },
      orderBy: { createdAt: "desc" },
    });
  }

  async listAllMasterConfigs(): Promise<MasterConfig[]> {
    return await this.db.masterConfig.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteMasterConfig(id: string): Promise<void> {
    await this.db.masterConfig.delete({
      where: { id },
    });
  }
}

export const masterConfigRepository = new MasterConfigRepository();
