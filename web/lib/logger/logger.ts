import winston from "winston";
import Transport from "winston-transport";
import { logService } from "../services/log";

// ログのメタデータ型定義
type LogMetadata = {
  clientId?: string;
  path?: string;
  service?: string;
  [key: string]: unknown;
};

// Edge 環境検出
const isEdgeRuntime =
  typeof process === "undefined" || process.env?.NEXT_RUNTIME === "edge";

// Edge ランタイム用のシンプルなロガー
class EdgeLogger {
  private level: string;
  private service: string;

  constructor(options: { level?: string; defaultMeta?: { service: string } }) {
    this.level = options.level || "info";
    this.service = options.defaultMeta?.service || "unknown";
  }

  log(level: string, message: string, meta: LogMetadata = {}) {
    // Edge環境ではコンソール出力のみ
    console.log(`[${level.toUpperCase()}] ${message}`, {
      ...meta,
      service: this.service,
    });

    // DB記録が必要な場合は fetch API を使った実装も可能
    // この例では簡易的にコンソール出力のみ
  }

  info(message: string, meta: LogMetadata = {}) {
    this.log("info", message, meta);
  }

  error(message: string, meta: LogMetadata = {}) {
    this.log("error", message, meta);
  }

  warn(message: string, meta: LogMetadata = {}) {
    this.log("warn", message, meta);
  }

  debug(message: string, meta: LogMetadata = {}) {
    if (this.level === "debug") {
      this.log("debug", message, meta);
    }
  }
}

// PrismaTransport (Node.js環境用)
class PrismaTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  async log(
    info: winston.LogEntry,
    callback: (error?: Error | null, success?: boolean) => void
  ) {
    try {
      const { level, message, source, ...metadata } = info;

      // timestampの処理
      let timestamp: Date;
      if (metadata.timestamp) {
        timestamp =
          typeof metadata.timestamp === "string"
            ? new Date(metadata.timestamp)
            : metadata.timestamp instanceof Date
            ? metadata.timestamp
            : new Date();
      } else {
        timestamp = new Date();
      }

      // Prismaを使ってログを保存
      await logService.createLog({
        level: level as string,
        message: message as string,
        metadata: (metadata as LogMetadata) || {},
        clientId: (metadata as LogMetadata).clientId || null,
        path: (metadata as LogMetadata).path || null,
        timestamp,
        source: (source as string) || "web_server",
      });
      callback(null, true);
    } catch (error) {
      console.error("Prismaログ保存エラー:", error);
      callback(error as Error);
    }
  }
}

// 環境に応じて適切なロガーを作成
let logger: winston.Logger | EdgeLogger;

if (isEdgeRuntime) {
  // Edge Runtime用のシンプルなロガー
  logger = new EdgeLogger({
    level: "info", // Edge環境ではデフォルトでinfoレベル
    defaultMeta: { service: "ai-tarot-chat" },
  });
} else {
  // Node.js環境用のWinstonロガー
  const isDev = process.env.NODE_ENV !== "production";
  const logDir = `${process.cwd()}/logs`;

  logger = winston.createLogger({
    level: isDev ? "debug" : "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: { service: "ai-tarot-chat" },
    transports: [
      // コンソール出力
      ...(isDev || process.env.DISABLE_CONSOLE_LOG !== "true"
        ? [
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(
                  ({ timestamp, level, message, ...meta }) =>
                    `${timestamp} [${level}]: ${message} ${
                      Object.keys(meta).length && meta.service
                        ? JSON.stringify(meta)
                        : ""
                    }`
                )
              ),
            }),
          ]
        : []),

      // ファイル出力
      ...(process.env.ENABLE_FILE_LOG === "true"
        ? [
            new winston.transports.File({
              filename: `${logDir}/error.log`,
              level: "error",
              maxsize: 10485760,
              maxFiles: 10,
            }),
            new winston.transports.File({
              filename: `${logDir}/combined.log`,
              maxsize: 10485760,
              maxFiles: 10,
            }),
          ]
        : []),

      // Prisma/DB出力
      ...(process.env.ENABLE_DB_LOG === "true"
        ? [new PrismaTransport({ level: "info" })]
        : []),
    ],
  });
}

// 共通インターフェース
export const logWithContext = (
  level: "info" | "error" | "warn" | "debug",
  message: string,
  context?: LogMetadata,
  source: string = "web_server"
) => {
  if (isEdgeRuntime) {
    // Edge環境
    (logger as EdgeLogger).log(level, message, { ...context, source });
  } else {
    // Node.js環境
    (logger as winston.Logger).log(level, message, { ...context, source });
  }
};

export default logger;
