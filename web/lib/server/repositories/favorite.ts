import type { FavoriteSpread } from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class FavoriteRepository extends BaseRepository {
  async createFavoriteSpread(
    favorite: Omit<FavoriteSpread, "id" | "createdAt" | "client" | "spread">
  ): Promise<string> {
    const created = await this.db.favoriteSpread.create({
      data: {
        clientId: favorite.clientId,
        spreadId: favorite.spreadId,
      },
    });

    return created.id;
  }

  async getFavoritesByClientId(clientId: string): Promise<FavoriteSpread[]> {
    return await this.db.favoriteSpread.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      include: { spread: true },
    });
  }

  async isFavorite(clientId: string, spreadId: string): Promise<boolean> {
    const favorite = await this.db.favoriteSpread.findFirst({
      where: {
        clientId,
        spreadId,
      },
    });

    return favorite !== null;
  }

  async deleteFavorite(clientId: string, spreadId: string): Promise<void> {
    await this.db.favoriteSpread.deleteMany({
      where: {
        clientId,
        spreadId,
      },
    });
  }

  async deleteFavoritesByClientId(clientId: string): Promise<void> {
    await this.db.favoriteSpread.deleteMany({
      where: { clientId },
    });
  }
}

export const favoriteRepository = new FavoriteRepository();
