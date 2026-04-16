/**
 * 管理者認証済みページテスト
 *
 * global-setup.ts で生成した管理者 storageState (admin JWT セッション cookie) を使用。
 * playwright.config.ts の "admin-authenticated" プロジェクトで実行される。
 *
 * テスト内容:
 *   1. 管理者認証チェック: 未承認セッションは /admin/auth/pending にリダイレクト
 *   2. 管理画面ページ: 認証済みで各ページが表示されること
 *   3. 管理者サインインページ: 認証済みなら /admin にリダイレクト
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

/** 管理者認証済みでページが開けることを共通検証 */
async function assertAdminPage(page: Page, path: string) {
  const getErrors = collectTypeErrors(page);
  await page.goto(path);
  await page.waitForLoadState("networkidle");

  expect(
    page.url(),
    `${path} が /admin/auth/signin にリダイレクトされた（セッションが無効）`
  ).not.toContain("/admin/auth/signin");

  expect(
    page.url(),
    `${path} が /admin/auth/pending にリダイレクトされた（未承認）`
  ).not.toContain("/admin/auth/pending");

  expect(
    getErrors(),
    `${path} で TypeError 発生:\n${getErrors().join("\n")}`
  ).toHaveLength(0);
}

// ─────────────────────────────────────────────────────────
// 1. 管理画面ページ（管理者認証済み）
// 未認証リダイレクトは pages.spec.ts の unauthenticated プロジェクトでカバー
// ─────────────────────────────────────────────────────────

const ADMIN_PAGES = [
  { path: "/admin",               label: "ダッシュボード" },
  { path: "/admin/clients",       label: "クライアント一覧" },
  { path: "/admin/readings",      label: "リーディング一覧" },
  { path: "/admin/tarotists",     label: "タロティスト一覧" },
  { path: "/admin/spreads",       label: "スプレッド一覧" },
  { path: "/admin/users",         label: "管理者ユーザー管理" },
  { path: "/admin/stats",         label: "統計" },
  { path: "/admin/revenue",       label: "収益" },
  { path: "/admin/notifications", label: "通知管理" },
  { path: "/admin/x-posts",       label: "X 投稿管理" },
  { path: "/admin/log-viewer",    label: "ログビューワー" },
] as const;

test.describe("管理画面ページ（管理者認証済み）", () => {
  for (const { path, label } of ADMIN_PAGES) {
    test(`${label} (${path}): 表示される・TypeError なし`, async ({ page }) => {
      await assertAdminPage(page, path);
    });
  }
});

// ─────────────────────────────────────────────────────────
// 3. 管理者サインインページ: 認証済みなら /admin へリダイレクト
// ─────────────────────────────────────────────────────────

test.describe("管理者サインインページ（認証済み）", () => {
  test("/admin/auth/signin: 認証済みなら /admin にリダイレクト", async ({
    page,
  }) => {
    await page.goto("/admin/auth/signin");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/admin");
    expect(page.url()).not.toContain("/admin/auth/signin");
  });

  test("/admin/auth/pending: 認証済みかつ承認済みなら /admin にリダイレクト", async ({
    page,
  }) => {
    await page.goto("/admin/auth/pending");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/admin");
    expect(page.url()).not.toContain("/admin/auth/pending");
  });
});
