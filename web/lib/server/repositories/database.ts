import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// dev hot-reload: preserve pool + client across module reloads to avoid pool exhaustion
const globalForPrisma = global as unknown as {
  pgPool: Pool | undefined;
  prismaClient: PrismaClient | undefined;
};

function createPool(): Pool {
  return new Pool({ connectionString: process.env.DATABASE_URL! });
}

function createPrismaClient(pool: Pool): PrismaClient {
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

const pool = globalForPrisma.pgPool ?? createPool();
const client = globalForPrisma.prismaClient ?? createPrismaClient(pool);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pgPool = pool;
  globalForPrisma.prismaClient = client;
}

export const prisma = client;

export const DatabaseManager = {
  get prisma() {
    return client;
  },
  async disconnect() {
    await client.$disconnect();
    await pool.end();
  },
};
