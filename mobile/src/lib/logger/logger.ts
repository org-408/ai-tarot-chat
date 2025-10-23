import { CapacitorHttp } from "@capacitor/core";

export const logWithContext = (
  level: "info" | "error" | "warn" | "debug",
  message: string,
  context?: { clientId?: string; path?: string; [key: string]: unknown },
  source: string = "mobile"
) => {
  // コンソールにも出力（開発時に便利）
  console.log(`[${level.toUpperCase()}] ${message}`, context);

  // タイムスタンプ追加
  context = { ...context, timestamp: new Date() };

  // サーバーに送信（認証なし）
  try {
    CapacitorHttp.post({
      url: `${
        import.meta.env.VITE_BFF_URL || "http://localhost:3000"
      }/api/logger`,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        level,
        message,
        context,
        source,
      },
    }).catch((e) => console.error("ログ送信エラー:", e));
  } catch (e) {
    // エラーが発生しても処理を続行
    console.error("ログ送信例外:", e);
  }
};
