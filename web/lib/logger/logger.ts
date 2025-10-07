import winston from 'winston';
import Transport from 'winston-transport';
import { logService } from '../services/log';

// Edge 環境でも動作するパス結合関数
function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}

// カスタムトランスポート（Prisma用）
class PrismaTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  async log(info: winston.LogEntry, callback: (error?: Error | null, success?: boolean) => void) {
    try {
      const { level, message, ...metadata } = info;
      // Prismaを使ってログを保存
      await logService.createLog({
        level: level as string,
        message: message as string,
        metadata: metadata || {},
        clientId: metadata.clientId || null,
        path: metadata.path || null,
      });
      callback(null, true);
    } catch (error) {
      console.error('Prismaログ保存エラー:', error);
      callback(error as Error);
    }
  }
}

const isEdge = typeof process === 'undefined' || process.env?.NEXT_RUNTIME === 'edge';

// 環境に応じて適切な値を返す関数
function getBaseDir(): string {
  if (isEdge) {
    return '/logs'; // Edge環境ではこの値は実際には使われない
  }
  
  return process.cwd();
}

const logDir = joinPath(getBaseDir(), 'logs');

// 環境設定
const isDev = typeof process !== 'undefined' && process.env
  ? process.env.NODE_ENV !== 'production' 
  : false;

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
    ...(isDev || (typeof process !== 'undefined' && process.env && process.env.DISABLE_CONSOLE_LOG !== 'true')
      ? [new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => 
              `${timestamp} [${level}]: ${message} ${Object.keys(meta).length && meta.service ? JSON.stringify(meta) : ''}`
            )
          )
        })]
      : []),
    
    // 2. ファイル出力 (ENABLE_FILE_LOG=trueなら有効かつNode.js環境の場合のみ)
    ...((typeof process !== 'undefined' && process.env && process.env.ENABLE_FILE_LOG === 'true' && typeof window === 'undefined')
      ? [
          new winston.transports.File({ 
            filename: joinPath(logDir, 'error.log'),
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 10,
          }),
          new winston.transports.File({ 
            filename: joinPath(logDir, 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 10,
          })
        ] 
      : []),
    
    // 3. Prisma/DB出力 (ENABLE_DB_LOG=trueなら有効)
    ...((typeof process !== 'undefined' && process.env && process.env.ENABLE_DB_LOG === 'true')
      ? [new PrismaTransport({ level: 'info' })] // infoレベル以上のみDBに保存
      : [])
  ],
});

// ショートハンドメソッド（コンテキスト情報付きログ）
export const logWithContext = (
  level: 'info' | 'error' | 'warn' | 'debug',
  message: string, 
  context?: { clientId?: string; path?: string; [key: string]: unknown }
) => {
  logger.log(level, message, context);
};

export default logger;