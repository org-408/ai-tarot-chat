import type {
  Tarotist,
  TarotistInput,
  TarotistWithPlanCode,
} from "@/../shared/lib/types";
import { convertToPrismaProviderKey } from "../utils/prisma";
import { BaseRepository } from "./base";

export class TarotistRepository extends BaseRepository {
  async createTarotist(tarotist: TarotistInput): Promise<Tarotist> {
    const created = await this.db.tarotist.create({
      data: {
        no: tarotist.no,
        name: tarotist.name,
        title: tarotist.title,
        icon: tarotist.icon,
        trait: tarotist.trait,
        bio: tarotist.bio,
        primaryColor: tarotist.primaryColor,
        secondaryColor: tarotist.secondaryColor,
        accentColor: tarotist.accentColor,
        avatarUrl: tarotist.avatarUrl,
        provider: convertToPrismaProviderKey(tarotist.provider!),
        cost: tarotist.cost,
        quality: tarotist.quality,
        planId: tarotist.planId,
        deletedAt: tarotist.deletedAt,
      },
    });

    return created;
  }

  async createTarotistWithPlanCode(
    tarotist: TarotistWithPlanCode
  ): Promise<Tarotist> {
    const { provider, planCode, ...rest } = tarotist;
    return await this.db.tarotist.create({
      data: {
        provider: convertToPrismaProviderKey(provider!),
        ...rest,
        plan: { connect: { code: planCode } },
      },
      include: { plan: true },
    });
  }

  async getTarotistById(
    id: string,
    soft: boolean = true
  ): Promise<Tarotist | null> {
    return await this.db.tarotist.findUnique({
      where: soft ? { id, deletedAt: null } : { id },
      include: { plan: true },
    });
  }

  async getDefaultTarotist(): Promise<Tarotist | null> {
    return await this.db.tarotist.findFirst({
      include: { plan: true },
    });
  }

  async getAllTarotists(soft: boolean = true): Promise<Tarotist[]> {
    return await this.db.tarotist.findMany({
      where: soft ? { deletedAt: null } : undefined,
      include: { plan: true },
      orderBy: { no: "asc" },
    });
  }

  async updateTarotist(
    id: string,
    data: Partial<Tarotist>,
    soft: boolean = true
  ): Promise<Tarotist> {
    // planプロパティを適切な形式に変換
    const { provider, planId, plan, ...rest } = data;
    console.log(planId, plan);

    return await this.db.tarotist.update({
      where: { id, ...(soft ? { deletedAt: null } : {}) },
      data: {
        ...(provider != null
          ? { provider: { set: convertToPrismaProviderKey(provider) } }
          : {}),
        ...(rest as Omit<
          Tarotist,
          | "id"
          | "createdAt"
          | "updatedAt"
          | "readings"
          | "chatMessages"
          | "plan"
          | "planId"
        >),
        plan: { connect: { id: planId } },
      },
      include: {
        plan: true,
      },
    });
  }

  async deleteTarotist(id: string, soft: boolean = true): Promise<Tarotist> {
    return await this.db.tarotist.update({
      where: { id, ...(soft ? { deletedAt: null } : {}) },
      data: { deletedAt: new Date() },
      include: { plan: true },
    });
  }
}

export const tarotistRepository = new TarotistRepository();
