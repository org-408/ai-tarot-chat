/**
 * 認証済みページテスト
 *
 * global-setup.ts で生成した storageState (JWT セッション cookie) を使用。
 * playwright.config.ts の "authenticated" プロジェクトで実行される。
 *
 * テスト内容:
 *   - /auth/signin にリダイレクトされずページが表示されること
 *   - ページ固有の主要 UI 要素が存在すること
 *   - JavaScript TypeError が発生しないこと
 */

import { test, expect, type Page } from "@playwright/test";

function collectTypeErrors(page: Page): () => string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => {
    if (
      err.name === "TypeError" ||
      err.message.toLowerCase().startsWith("typeerror")
    ) {
      errors.push(`${err.name}: ${err.message}`);
    }
  });
  return () => errors;
}

/** 認証済みでページが開けることを共通検証 */
async function assertAuthenticatedPage(page: Page, path: string) {
  const getErrors = collectTypeErrors(page);
  await page.goto(path);
  await page.waitForLoadState("networkidle");

  expect(
    page.url(),
    `${path} が /auth/signin にリダイレクトされた（セッションが無効）`
  ).not.toContain("/auth/signin");
  expect(
    getErrors(),
    `${path} で TypeError 発生:\n${getErrors().join("\n")}`
  ).toHaveLength(0);
}

// ─────────────────────────────────────────────────────────
// サービスページ
// ─────────────────────────────────────────────────────────

test.describe("サービスページ（認証済み）", () => {
  test("/simple: クイック占いUIが表示される", async ({ page }) => {
    await assertAuthenticatedPage(page, "/simple");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });


  test("/personal: パーソナル占いUIが表示される", async ({ page }) => {
    await assertAuthenticatedPage(page, "/personal");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("/clara: いつでも占いUIが表示される", async ({ page }) => {
    await assertAuthenticatedPage(page, "/clara");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("/history: 履歴ページが表示される", async ({ page }) => {
    await assertAuthenticatedPage(page, "/history");
  });

  test("/tarotists: タロティスト一覧が表示される", async ({ page }) => {
    await assertAuthenticatedPage(page, "/tarotists");
  });

  test("/plans: プラン一覧ページが表示される", async ({ page }) => {
    await assertAuthenticatedPage(page, "/plans");
  });

  test("/settings: 設定ページが表示される", async ({ page }) => {
    await assertAuthenticatedPage(page, "/settings");
  });

});

// ─────────────────────────────────────────────────────────
// スマートエントリ: 認証済みはホームダッシュボードを表示
// ─────────────────────────────────────────────────────────

test.describe("スマートエントリ（認証済み）", () => {
  test("/: 認証済みならホームダッシュボードが表示される", async ({ page }) => {
    const getErrors = collectTypeErrors(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // /auth/signin にリダイレクトされないこと
    expect(page.url()).not.toContain("/auth/signin");
    // /salon にリダイレクトされないこと（/ のまま）
    expect(page.url()).not.toContain("/salon");
    expect(getErrors()).toHaveLength(0);
  });
});
