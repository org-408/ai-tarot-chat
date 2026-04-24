import { test as base, type Page } from "@playwright/test";

/**
 * Capacitor プラグインと BFF API の最小 stub。
 *
 * このプロジェクトはネイティブ shell + WebView なので、Playwright で
 * ブラウザ実行する際は以下が必要:
 *   1. Capacitor プラグインが native 実装を探すため `window.Capacitor` を注入
 *   2. BFF API 呼び出しを `page.route` で 200 stub 応答に差し替え
 * これで起動シーケンス (lifecycle.init) が止まらずに Home まで到達できる。
 *
 * i18n テキスト検証が目的なので、プラグインの挙動は no-op / 固定値で十分。
 */

export type Locale = "ja" | "en";

async function installCapacitorStub(page: Page, locale: Locale) {
  await page.addInitScript((lang) => {
    // Capacitor core の web fallback。大半のプラグインは `registerPlugin` が
    // default export の web 実装にフォールバックするので、ここでは
    // native platform だと誤認させないことだけが重要。
    const noop = async () => ({});
    const stubs = {
      Device: {
        getLanguageCode: async () => ({ value: lang }),
        getInfo: async () => ({
          platform: "web",
          osVersion: "test",
          model: "e2e",
          manufacturer: "e2e",
          operatingSystem: "web",
          isVirtual: false,
          memUsed: 0,
          diskFree: 0,
          diskTotal: 0,
          webViewVersion: "test",
        }),
        getId: async () => ({ identifier: "e2e-device-id" }),
      },
      Preferences: {
        get: async () => ({ value: null }),
        set: noop,
        remove: noop,
        clear: noop,
        keys: async () => ({ keys: [] }),
      },
      App: {
        getInfo: async () => ({
          name: "mobile",
          id: "com.atelierflowlab.aitarotchat",
          build: "1",
          version: "0.0.0",
        }),
        addListener: () => Promise.resolve({ remove: noop }),
      },
      Keyboard: {
        addListener: () => Promise.resolve({ remove: noop }),
        setAccessoryBarVisible: noop,
      },
    };
    // @ts-expect-error inject
    window.Capacitor = {
      Plugins: stubs,
      isNativePlatform: () => false,
      getPlatform: () => "web",
      convertFileSrc: (url: string) => url,
    };
  }, locale === "ja" ? "ja-JP" : "en-US");
}

async function installApiStubs(page: Page) {
  // すべての BFF 呼び出しを fail fast させずにモック応答する。
  // Smoke test は Home 画面までのレンダリング確認が目的なので、
  // 最低限「起動がブロックされない」応答を返す。
  await page.route(/\/api\/.*/, async (route) => {
    const url = route.request().url();
    let body: unknown = {};
    if (url.includes("/api/device/register")) {
      body = { token: "stub-jwt" };
    } else if (url.includes("/api/masters/check-update")) {
      body = { needsUpdate: false };
    } else if (url.includes("/api/clients/me")) {
      body = null;
    } else if (url.includes("/api/clients/readings")) {
      body = { readings: [], total: 0 };
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

export const test = base.extend<{ locale: Locale }>({
  locale: ["ja", { option: true }],
  page: async ({ page, locale }, use) => {
    await installCapacitorStub(page, locale);
    await installApiStubs(page);
    await use(page);
  },
});

export { expect } from "@playwright/test";

// ──────────────────────────────────────────────────────────────
// NG ワードリスト (Apple 4.3(b) 対応)
// ──────────────────────────────────────────────────────────────
export const NG_WORD_RE =
  /\b(fortune|fortune-?telling|predict(ion|s|or)?|horoscope|destiny|fate|zodiac)\b/i;
export const JA_CHAR_RE = /[\u3040-\u30FF\u3400-\u9FFF]/;
