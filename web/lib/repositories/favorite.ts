import type { FavoriteSpread } from "@/../../shared/lib/types";
import { BaseRepository } from "./base";

export class FavoriteRepository extends BaseRepository {
  async createFavoriteSpread(
    favorite: Omit<FavoriteSpread, "id" | "createdAt" | "user" | "spread">
  ): Promise<string> {
    const created = await this.db.favoriteSpread.create({
      data: {
        userId: favorite.userId,
        spreadId: favorite.spreadId,
      },
    });

    return created.id;
  }

  async getFavoritesByUserId(userId: string): Promise<FavoriteSpread[]> {
    return await this.db.favoriteSpread.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { spread: true },
    });
  }

  async isFavorite(userId: string, spreadId: string): Promise<boolean> {
    const favorite = await this.db.favoriteSpread.findFirst({
      where: {
        userId,
        spreadId,
      },
    });

    return favorite !== null;
  }

  async deleteFavorite(userId: string, spreadId: string): Promise<void> {
    await this.db.favoriteSpread.deleteMany({
      where: {
        userId,
        spreadId,
      },
    });
  }

  async deleteFavoritesByUserId(userId: string): Promise<void> {
    await this.db.favoriteSpread.deleteMany({
      where: { userId },
    });
  }
}

export const favoriteRepository = new FavoriteRepository();
