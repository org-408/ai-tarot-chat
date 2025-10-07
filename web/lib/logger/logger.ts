import winston from 'winston';
import Transport from 'winston-transport';
import path from 'path';
import { logService } from '../services/log';

// カスタムトランスポート（Prisma用）
class PrismaTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  async log(info: any, callback: Function) {
    try {
      const { level, message, timestamp, ...metadata } = info;
      // Prismaを使ってログを保存
      await logService.createLog({
        level,
        message,
        metadata: metadata || {},
        clientId: metadata.clientId || null,
        path: metadata.path || null,
      });
      callback(null, true);
    } catch (error) {
      console.error('Prismaログ保存エラー:', error);
      callback(error);
    }
  }
}

// ログディレクトリの設定
const logDir = path.join(process.cwd(), 'logs');

// 環境設定
const isDev = process.env.NODE_ENV !== 'production';

// ロガーの設定
const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-tarot-chat' },
  transports: [
    // 1. コンソール出力 (開発環境では常に有効、本番環境ではDISABLE_CONSOLE_LOGが設定されていなければ有効)
    ...(isDev || process.env.DISABLE_CONSOLE_LOG !== 'true' 
      ? [new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => 
              `${timestamp} [${level}]: ${message} ${Object.keys(meta).length && meta.service ? JSON.stringify(meta) : ''}`
            )
          )
        })]
      : []),
    
    // 2. ファイル出力 (ENABLE_FILE_LOG=trueなら有効)
    ...(process.env.ENABLE_FILE_LOG === 'true'
      ? [
          new winston.transports.File({ 
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 10,
          }),
          new winston.transports.File({ 
            filename: path.join(logDir, 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 10,
          })
        ] 
      : []),
    
    // 3. Prisma/DB出力 (ENABLE_DB_LOG=trueなら有効)
    ...(process.env.ENABLE_DB_LOG === 'true'
      ? [new PrismaTransport({ level: 'info' })] // infoレベル以上のみDBに保存
      : [])
  ],
});

// ショートハンドメソッド（コンテキスト情報付きログ）
export const logWithContext = (
  level: 'info' | 'error' | 'warn' | 'debug',
  message: string, 
  context?: { clientId?: string; path?: string; [key: string]: any }
) => {
  logger.log(level, message, context);
};

export default logger;