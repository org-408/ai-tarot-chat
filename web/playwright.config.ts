import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  // CI では並列実行しない（サーバーリソース節約）
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    browserName: "chromium",
  },
  // CI では next build 済みの前提で next start を起動
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    // AUTH_URL がないと Auth.js が UntrustedHost エラーを投げ、認証リダイレクトが機能しない
    env: {
      AUTH_URL: "http://localhost:3000",
    },
  },
});
