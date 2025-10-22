export const logWithContext = (
  level: "info" | "error" | "warn" | "debug",
  message: string,
  context?: { clientId?: string; path?: string; [key: string]: unknown },
  source: string = "web_app"
) => {
  // コンソールにも出力（開発時に便利）
  console.log(`[${level.toUpperCase()}] ${message}`, context);

  // タイムスタンプ追加
  context = { ...context, timestamp: new Date() };

  // サーバーに送信（認証なし）
  try {
    fetch("/api/logger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        level,
        message,
        context,
        source,
      }),
    }).catch((e) => console.error("ログ送信エラー:", e));
  } catch (e) {
    // エラーが発生しても処理を続行
    console.error("ログ送信例外:", e);
  }
};
