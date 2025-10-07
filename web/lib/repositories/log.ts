import type { Log } from "@/../shared/lib/types";
import { Prisma } from "@prisma/client";
import { BaseRepository } from "./base";

interface LogMetadata {
  [key: string]: unknown;
}

export class LogRepository extends BaseRepository {
  private convertPrismaLogToLog(prismaLog: Log): Log {
    return {
      id: prismaLog.id,
      level: prismaLog.level,
      message: prismaLog.message,
      metadata: prismaLog.metadata ? (prismaLog.metadata as unknown as LogMetadata) : undefined,
      clientId: prismaLog.clientId || undefined,
      path: prismaLog.path || "", // nullの場合は空文字列に変換
      createdAt: prismaLog.createdAt,
    };
  }

  async createLog(
    log: Omit<Log, "id" | "createdAt">
  ): Promise<string> {
    const created = await this.db.log.create({
      data: {
        level: log.level,
        message: log.message,
        metadata: log.metadata ? (log.metadata as unknown as Prisma.JsonObject) : undefined,
        clientId: log.clientId || null,
        path: log.path || null,
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
        createdAt: (startDate || endDate) ? {
          gte: startDate,
          lte: endDate
        } : undefined
      },
      orderBy: { createdAt: "desc" },
    });
    
    return logs.map(this.convertPrismaLogToLog);
  }

  async getRecentLogs(take: number = 100, skip: number = 0): Promise<Log[]> {
    const logs = await this.db.log.findMany({
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });
    
    return logs.map(this.convertPrismaLogToLog);
  }
}

export const logRepository = new LogRepository();