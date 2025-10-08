import type { Log } from "@/../shared/lib/types";
import { Prisma } from "@prisma/client";
import { BaseRepository } from "./base";

export class LogRepository extends BaseRepository {
  private convertPrismaLogToLog(prismaLog: {
    id: string;
    level: string;
    message: string;
    metadata: Prisma.JsonValue | null;
    clientId: string | null;
    path: string | null;
    timestamp: Date;
    source: string;
    createdAt: Date;
  }): Log {
    return {
      id: prismaLog.id,
      level: prismaLog.level,
      message: prismaLog.message,
      metadata: prismaLog.metadata
        ? (JSON.parse(JSON.stringify(prismaLog.metadata)) as Prisma.JsonObject)
        : undefined,
      clientId: prismaLog.clientId || undefined,
      path: prismaLog.path || "", // nullの場合は空文字列に変換
      timestamp: prismaLog.timestamp || 0,
      source: prismaLog.source || "web_server",
      createdAt: prismaLog.createdAt,
    };
  }

  async createLog(log: Omit<Log, "id" | "createdAt">): Promise<string> {
    const created = await this.db.log.create({
      data: {
        level: log.level,
        message: log.message,
        metadata: log.metadata
          ? (log.metadata as unknown as Prisma.JsonObject)
          : undefined,
        clientId: log.clientId || null,
        path: log.path || null,
        timestamp: log.timestamp || new Date(),
        source: log.source || "web_server",
      },
    });

    return created.id;
  }

  async getLogsByLevelAndDateRange(
    level: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Log[]> {
    const logs = await this.db.log.findMany({
      where: {
        level,
        timestamp:
          startDate || endDate
            ? {
                gte: startDate,
                lte: endDate,
              }
            : undefined,
      },
      orderBy: { timestamp: "desc" },
    });

    return logs.map(this.convertPrismaLogToLog);
  }

  async getRecentLogs(take: number = 100, skip: number = 0): Promise<Log[]> {
    const logs = await this.db.log.findMany({
      orderBy: { timestamp: "desc" },
      take,
      skip,
    });

    return logs.map(this.convertPrismaLogToLog);
  }
}

export const logRepository = new LogRepository();
