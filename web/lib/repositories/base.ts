import type { PrismaClient } from "@prisma/client";
import { prisma } from "./database";

// Prismaの$transactionコールバックの型を直接抽出
type TransactionCallback = Parameters<typeof prisma.$transaction>[0];
type PrismaTransaction = Parameters<TransactionCallback>[0];

/**
 * Repository基底クラス
 */
export abstract class BaseRepository {
  // トランザクションコンテキスト（オプション）
  private txContext?: PrismaTransaction;

  protected get db(): PrismaClient | PrismaTransaction {
    // トランザクションコンテキストがあればそれを使う
    return (this.txContext ?? prisma) as PrismaClient;
  }

  /**
   * トランザクションコンテキスト付きのRepositoryインスタンスを返す
   */
  withTransaction(tx: PrismaTransaction): this {
    const instance = Object.create(Object.getPrototypeOf(this));
    Object.assign(instance, this);
    instance.txContext = tx;
    return instance;
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
    callback: (tx: PrismaTransaction) => Promise<T>
  ): Promise<T> {
    return await prisma.$transaction(async (tx) => {
      return await callback(tx);
    });
  }
}
