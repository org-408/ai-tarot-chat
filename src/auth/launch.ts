import { openUrl } from "@tauri-apps/plugin-opener";

export async function startOAuth() {
  const url = `http://localhost:3000/auth/signin?isTauri=true`;
  try {
    await openUrl(url, "inAppBrowser"); // ← iOS: SFSafariViewController / Android: Custom Tabs
  } catch (error) {
    console.error("Failed to open inAppBrowser URL:", error);
    await openUrl(url); // フォールバックでデフォルトブラウザを開く
  }
}
