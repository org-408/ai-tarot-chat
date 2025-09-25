import type { Tarotist } from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class TarotistRepository extends BaseRepository {
  async createTarotist(
    tarotist: Omit<
      Tarotist,
      "id" | "createdAt" | "updatedAt" | "readings" | "chatMessages"
    >
  ): Promise<string> {
    const created = await this.db.tarotist.create({
      data: {
        name: tarotist.name,
        bio: tarotist.bio,
        avatarUrl: tarotist.avatarUrl,
        deletedAt: tarotist.deletedAt,
      },
    });

    return created.id;
  }

  async getTarotistById(id: string): Promise<Tarotist | null> {
    return await this.db.tarotist.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async getAllTarotists(): Promise<Tarotist[]> {
    return await this.db.tarotist.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  async updateTarotist(
    id: string,
    updates: Partial<
      Omit<
        Tarotist,
        "id" | "createdAt" | "updatedAt" | "readings" | "chatMessages"
      >
    >
  ): Promise<void> {
    await this.db.tarotist.update({
      where: { id },
      data: updates,
    });
  }

  async softDeleteTarotist(id: string): Promise<void> {
    await this.db.tarotist.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const tarotistRepository = new TarotistRepository();
