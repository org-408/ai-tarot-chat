import { defineConfig, devices } from "@playwright/test";

// iPhone プロファイルは WebKit を要求する。CI では chromium のみ install する
// 前提なので、viewport と user agent だけモバイル相当に寄せたうえで chromium を使う。
// UI テキスト検証 (4.3(b) 対策) が目的なので描画エンジンの差は無視してよい。
const MOBILE_VIEWPORT = {
  viewport: { width: 390, height: 844 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
};
void devices; // keep import for reference

// Capacitor モバイルアプリの UI 層は WebView (Vite 成果物) で動くため、
// ブラウザ上で動かしたときと iOS/Android ネイティブ上の WebView で表示は実質等価。
// Apple 4.3(b) 対策 (UI テキスト・ロケール切替・NG ワード検出) としては
// Vite dev server 上での Playwright smoke test で十分カバーできる。
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    // iPhone サイズを前提にする (実機に近い viewport)
    viewport: { width: 390, height: 844 },
  },
  projects: [
    {
      name: "chromium-mobile",
      use: { browserName: "chromium", ...MOBILE_VIEWPORT },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    env: {
      // CI ビルドで使う env (本番 API は叩かない想定。テスト内で page.route で stub する)
      VITE_BFF_URL: "http://localhost:9999",
      VITE_DEBUG_MODE: "false",
      VITE_AUTH_SECRET:
        process.env.VITE_AUTH_SECRET ?? "e2e-dummy-secret-for-ui-tests-only",
    },
  },
});
