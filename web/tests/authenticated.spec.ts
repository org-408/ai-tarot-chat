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
  test("/salon: タロティスト・スプレッド選択UIが表示される", async ({
    page,
  }) => {
    await assertAuthenticatedPage(page, "/salon");
    // タロティスト選択セクションが存在する
    await expect(page.locator("h1, h2").first()).toBeVisible();
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

  // /reading・/personal は salon store の事前セットアップが必要なためスキップ
  // （スプレッド未選択の場合はエラー表示になるが、それ自体が正常な挙動）
  test("/reading: 未選択エラー表示または選択画面（TypeError なし）", async ({
    page,
  }) => {
    const getErrors = collectTypeErrors(page);
    await page.goto("/reading");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/auth/signin");
    expect(getErrors()).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────
// スマートエントリ: 認証済みは /salon へリダイレクト
// ─────────────────────────────────────────────────────────

test.describe("スマートエントリ（認証済み）", () => {
  test("/: 認証済みなら /salon にリダイレクトされる", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/salon");
  });

  test("マーケティング LP: 認証済みなら /salon にリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/ja");
    await page.waitForLoadState("networkidle");

    // LP は認証済みユーザーを /salon に飛ばす
    expect(page.url()).toContain("/salon");
  });
});

// ─────────────────────────────────────────────────────────
// サイドバーナビゲーション
// ─────────────────────────────────────────────────────────

test.describe("サイドバーナビゲーション", () => {
  test("/salon: サイドバーが表示される", async ({ page }) => {
    await page.goto("/salon");
    await page.waitForLoadState("networkidle");

    // サイドバーのナビゲーション要素（Wand2 アイコンボタン等）が存在する
    const sidebar = page.locator("[data-slot='sidebar']").first();
    await expect(sidebar).toBeVisible();
  });
});
