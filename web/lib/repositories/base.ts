import type { PrismaClient } from "@prisma/client";
import { prisma } from "./database";

/**
 * Repository基底クラス
 */
export abstract class BaseRepository {
  protected get db(): PrismaClient {
    return prisma;
  }

  // ユーティリティメソッド
  protected parseJSON<T>(json: string): T {
    return JSON.parse(json);
  }

  protected stringifyJSON<T>(data: T): string {
    return JSON.stringify(data);
  }

  // トランザクション実行
  protected async transaction<T>(
    callback: (tx: PrismaClient) => Promise<T>
  ): Promise<T> {
    return await this.db.$transaction(async (tx) => {
      return await callback(tx as PrismaClient);
    });
  }
}
