import { test, expect, NG_WORD_RE, JA_CHAR_RE } from "./fixtures";

/**
 * Apple 4.3(b) 対応の smoke test。
 *
 * 目的:
 *   - 英語ロケールで起動時に、画面に日本語文字・NG ワードが混入していないこと
 *   - 日本語ロケールで起動時に、splash/初期画面の文言がリポジション後の語彙であること
 *
 * ── テスト戦略 ───────────────────────────────────────────────
 * アプリの Home 以降は BFF/RevenueCat/SQLite など複数の Stub が揃わないと
 * 到達できない。この smoke test では「起動直後に表示される画面 (splash)」の
 * 文字列レベルで NG ワード・JA 混入を検出する。
 *
 * splash の文言は i18n テキストをレンダリングしているため、もし ja.json/en.json
 * に NG ワードや翻訳漏れが残っていればこのテストで落ちる。追加で深い画面の
 * 検証が必要になった場合は、別途 Home 以降のテストを追加する (issue 参照)。
 */

const STABILIZE_MS = 1500;

async function pageText(page: import("@playwright/test").Page) {
  // splash が表示されるまで待ち、テキスト安定化を待つ
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(STABILIZE_MS);
  return await page.locator("body").innerText();
}

test.describe("JA locale", () => {
  test.use({ locale: "ja" });

  test("起動直後の画面にリポジション済み文言が含まれる", async ({ page }) => {
    await page.goto("/");
    const text = await pageText(page);
    // splash の tagline は リポジション済みの「リーディング」を含む
    expect(text).toMatch(/リーディング/);
  });
});

test.describe("EN locale", () => {
  test.use({ locale: "en" });

  test("起動直後の画面に日本語文字が含まれない", async ({ page }) => {
    await page.goto("/");
    const text = await pageText(page);
    const jaChars = text.match(new RegExp(JA_CHAR_RE.source, "g")) ?? [];
    expect(
      jaChars,
      `English UI contains Japanese characters (translation leak): ${JSON.stringify(
        jaChars.slice(0, 20),
      )}`,
    ).toHaveLength(0);
  });

  test("起動直後の画面に Apple NG ワードが含まれない", async ({ page }) => {
    await page.goto("/");
    const text = await pageText(page);
    const match = text.match(NG_WORD_RE);
    expect(
      match,
      `Found NG word in English UI: "${match?.[0]}"`,
    ).toBeNull();
  });
});
