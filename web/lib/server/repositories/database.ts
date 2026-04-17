import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    // Prisma v7 + driver adapter: per-transaction { timeout, maxWait } options are
    // silently ignored. Set global defaults here so they actually take effect.
    transactionOptions: {
      timeout: 3 * 60 * 1000, // 3 minutes (matches previous base.ts default)
      maxWait: 30 * 1000,     // 30 seconds (matches previous base.ts default)
    },
  });
}

class DatabaseManager {
  private static instance: PrismaClient | null = null;

  static getInstance(): PrismaClient {
    if (!this.instance) {
      this.instance = createPrismaClient();
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
