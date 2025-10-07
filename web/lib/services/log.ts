import { Log } from "../../../shared/lib/types";
import { logRepository } from "../repositories/log";

export class LogService {
    async createLog(
      log: Omit<Log, "id" | "createdAt">
    ): Promise<string> {
      return logRepository.createLog(log);
    }
  
    async getLogsByLevelAndDateRange(
      level: string,
      startDate?: Date,
      endDate?: Date
    ): Promise<Log[]> {
      return logRepository.getLogsByLevelAndDateRange(level, startDate, endDate);
    }
  
    async getRecentLogs(take: number = 100, skip: number = 0): Promise<Log[]> {
      return logRepository.getRecentLogs(take, skip);
    }
  }
  
  export const logService = new LogService();
  