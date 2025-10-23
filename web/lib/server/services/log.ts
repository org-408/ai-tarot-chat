import { Log } from "@/../shared/lib/types";
import {
  BaseRepository,
  clientRepository,
  logRepository,
} from "@/lib/server/repositories";

export class LogService {
  async createLog(log: Omit<Log, "id" | "createdAt">): Promise<string> {
    // clientIdが存在しない場合はnullをセット
    const { clientId } = log;

    if (clientId) {
      // clientの存在確認とログ作成をトランザクション化
      return BaseRepository.transaction(
        { client: clientRepository, log: logRepository },
        async ({ client: clientRepo, log: logRepo }) => {
          const clientExists = await clientRepo.getClientById(clientId);
          if (!clientExists) {
            log.metadata = {
              ...log.metadata,
              invalidClientId: clientId,
            };
            log.clientId = null;
          }
          return logRepo.createLog(log);
        }
      );
    }

    // clientIdが存在しない場合は通常のログ作成
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
