import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  // CI では並列実行しない（サーバーリソース節約）
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",

  // 認証済みテスト用のセットアップ
  globalSetup: "./tests/global-setup.ts",

  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    // ── 未認証テスト（公開ページ・リダイレクト確認）──
    {
      name: "unauthenticated",
      testMatch: ["**/smoke.spec.ts", "**/pages.spec.ts"],
      use: { browserName: "chromium" },
    },
    // ── 認証済みテスト（アプリページ内容確認）──
    {
      name: "authenticated",
      testMatch: "**/authenticated.spec.ts",
      use: {
        browserName: "chromium",
        storageState: "./tests/.auth/app.json",
      },
    },
    // ── 管理者認証済みテスト（管理画面内容確認）──
    {
      name: "admin-authenticated",
      testMatch: "**/admin-authenticated.spec.ts",
      use: {
        browserName: "chromium",
        storageState: "./tests/.auth/admin.json",
      },
    },
  ],

  // CI では next build 済みの前提で next start を起動
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    // AUTH_URL がないと Auth.js が UntrustedHost エラーを throw し、
    // 認証リダイレクトが機能しない
    env: {
      AUTH_URL: "http://localhost:3000",
    },
  },
});
