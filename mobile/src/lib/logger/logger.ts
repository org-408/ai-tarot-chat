import { apiClient } from "../utils/apiClient";

export const logWithContext = (
  level: "info" | "error" | "warn" | "debug",
  message: string,
  context?: { clientId?: string; path?: string; [key: string]: unknown },
  device: string = "mobile"
) => {
  // コンソールにも出力（開発時に便利）
  console.log(`[${level.toUpperCase()}] ${message}`, context);

  // タイムスタンプ追加
  context = { ...context, timestamp: new Date() };

  // サーバーに送信（認証なし）
  try {
    apiClient
      .postWithoutAuth("/api/logger", {
        level,
        message,
        context,
        device,
      })
      .catch((e) => console.error("ログ送信エラー:", e));
  } catch (e) {
    // エラーが発生しても処理を続行
    console.error("ログ送信例外:", e);
  }
};
