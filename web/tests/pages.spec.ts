/**
 * 全ページスモークテスト
 *
 * 対象:
 *   1. マーケティングページ（公開）
 *   2. 認証ページ（公開）
 *   3. アプリページ（未認証 → /auth/signin リダイレクト確認）
 *   4. 管理画面（未認証 → /admin/auth/signin リダイレクト確認）
 *   5. 旧 URL 301 リダイレクト確認
 *
 * 認証済みユーザーのページ内容テストは別途 authenticated.spec.ts で行う。
 */

import { test, expect, type Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────
// ヘルパー: JavaScript TypeError を収集する
// ─────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────
// 1. マーケティングページ（公開 / 認証不要）
// ─────────────────────────────────────────────────────────

const MARKETING_PAGES = [
  { path: "/ja",            label: "LP (ja)" },
  { path: "/en",            label: "LP (en)" },
  { path: "/ja/pricing",    label: "料金プラン (ja)" },
  { path: "/en/pricing",    label: "料金プラン (en)" },
  { path: "/ja/download",   label: "ダウンロード (ja)" },
  { path: "/en/download",   label: "ダウンロード (en)" },
  { path: "/privacy",       label: "プライバシーポリシー" },
  { path: "/terms",         label: "利用規約" },
] as const;

test.describe("マーケティングページ", () => {
  for (const { path, label } of MARKETING_PAGES) {
    test(`${label} (${path}): 200 OK・TypeError なし`, async ({ page }) => {
      const getErrors = collectTypeErrors(page);
      const response = await page.goto(path);
      await page.waitForLoadState("networkidle");

      expect(
        response?.status(),
        `${path} が 4xx/5xx を返した`
      ).toBeLessThan(400);
      expect(
        getErrors(),
        `${path} で TypeError 発生:\n${getErrors().join("\n")}`
      ).toHaveLength(0);
    });
  }
});

// ─────────────────────────────────────────────────────────
// 2. 認証ページ（公開）
// ─────────────────────────────────────────────────────────

test.describe("認証ページ", () => {
  test("/auth/signin: 200 OK・Google ボタンが表示される", async ({ page }) => {
    const getErrors = collectTypeErrors(page);
    const response = await page.goto("/auth/signin");
    await page.waitForLoadState("networkidle");

    expect(response?.status()).toBeLessThan(400);
    expect(getErrors()).toHaveLength(0);
    await expect(
      page.getByRole("button", { name: /Google/i })
    ).toBeVisible();
  });

  test("/admin/auth/signin: 200 OK・TypeError なし", async ({ page }) => {
    const getErrors = collectTypeErrors(page);
    const response = await page.goto("/admin/auth/signin");
    await page.waitForLoadState("networkidle");

    expect(response?.status()).toBeLessThan(400);
    expect(getErrors()).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────
// 3. アプリページ（未認証 → /auth/signin へリダイレクト）
// ─────────────────────────────────────────────────────────

const APP_PAGES = [
  "/salon",
  "/reading",
  "/personal",
  "/history",
  "/tarotists",
  "/plans",
  "/settings",
] as const;

test.describe("アプリページ（未認証リダイレクト）", () => {
  for (const path of APP_PAGES) {
    test(`${path}: /auth/signin にリダイレクトされる`, async ({ page }) => {
      const getErrors = collectTypeErrors(page);
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      expect(
        page.url(),
        `${path} が /auth/signin にリダイレクトされなかった`
      ).toContain("/auth/signin");
      expect(getErrors()).toHaveLength(0);
    });
  }

  test("/: 未認証なら LP (/ja) にリダイレクトされる", async ({ page }) => {
    const getErrors = collectTypeErrors(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // スマートエントリ: 未認証 → /ja (LP)
    expect(page.url()).toMatch(/\/(ja|en)(\/|$)/);
    expect(getErrors()).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────
// 4. 管理画面（未認証 → /admin/auth/signin へリダイレクト）
// ─────────────────────────────────────────────────────────

const ADMIN_PAGES = [
  "/admin",
  "/admin/clients",
  "/admin/readings",
  "/admin/tarotists",
  "/admin/users",
  "/admin/stats",
  "/admin/revenue",
] as const;

test.describe("管理画面（未認証リダイレクト）", () => {
  for (const path of ADMIN_PAGES) {
    test(`${path}: /admin/auth/signin にリダイレクトされる`, async ({
      page,
    }) => {
      const getErrors = collectTypeErrors(page);
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      expect(
        page.url(),
        `${path} が /admin/auth/signin にリダイレクトされなかった`
      ).toContain("/admin/auth/signin");
      expect(getErrors()).toHaveLength(0);
    });
  }
});

// ─────────────────────────────────────────────────────────
// 5. 旧 URL 301 リダイレクト
//    next.config.ts に定義した permanent redirect の動作確認
// ─────────────────────────────────────────────────────────

const REDIRECT_MAP = [
  // PR1: 旧マーケティング URL
  { from: "/pricing",    to: "/ja/pricing" },
  { from: "/download",   to: "/ja/download" },
  // PR2: 旧アプリ URL (locale 付き → locale なし)
  //   最終的に未認証なら /auth/signin まで飛ぶが、
  //   途中で /salon を経由していることを response chain で確認
  { from: "/ja/plans",    to: "/plans" },
  { from: "/ja/settings", to: "/settings" },
  { from: "/ja/history",  to: "/history" },
  { from: "/ja/tarotists", to: "/tarotists" },
] as const;

test.describe("旧 URL 301 リダイレクト", () => {
  for (const { from, to } of REDIRECT_MAP) {
    test(`${from} → ${to}`, async ({ request }) => {
      // redirect: "manual" で 301 レスポンス自体を検査
      const response = await request.fetch(from, {
        maxRedirects: 0,
      });

      // Next.js の permanent: true は 308 (Permanent Redirect) を返す
      expect(
        response.status(),
        `${from} が 308 を返さなかった (実際: ${response.status()})`
      ).toBe(308);

      const location = response.headers()["location"] ?? "";
      expect(
        location,
        `${from} の Location ヘッダーが ${to} を含まない (実際: ${location})`
      ).toContain(to);
    });
  }
});
