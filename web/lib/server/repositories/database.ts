import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client シングルトン管理
 */
class DatabaseManager {
  private static instance: PrismaClient | null = null;

  static getInstance(): PrismaClient {
    if (!this.instance) {
      this.instance = new PrismaClient({
        log:
          process.env.NODE_ENV === "development"
            ? ["query", "error", "warn"]
            : ["error"],
      });
    }
    return this.instance;
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
    }
  }

  static get prisma(): PrismaClient {
    return this.getInstance();
  }
}

export const prisma = DatabaseManager.prisma;
export { DatabaseManager };
