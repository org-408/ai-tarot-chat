/**
 * Apple 4.3(b) locale 解決の HTTP スモークテスト
 *
 * 未認証 EN 審査員が踏む golden path をカバー:
 *   - Accept-Language: en-US で EN ページが返る
 *   - ?lang=en / ?lang=ja のクエリ優先
 *   - Cookie NEXT_LOCALE での切替
 *
 * Apple 審査員が日本サーバーから直接アクセスする想定なので、
 * 日本国内からも同等の挙動を再現できるよう request fixture で
 * Accept-Language / Cookie ヘッダを直接組み立てて検証する。
 */

import { test, expect } from "@playwright/test";

interface AssertionCase {
  label: string;
  path: string;
  headers?: Record<string, string>;
  expectIncludes: string[];
  expectExcludes: string[];
}

const SIGNIN_CASES: AssertionCase[] = [
  {
    label: "Accept-Language: en-US → EN サインイン",
    path: "/auth/signin",
    headers: { "accept-language": "en-US,en;q=0.9" },
    expectIncludes: ["Sign in", "Sign in with Google"],
    expectExcludes: ["サインイン"],
  },
  {
    label: "Accept-Language: ja-JP → JA サインイン",
    path: "/auth/signin",
    headers: { "accept-language": "ja-JP,ja;q=0.9" },
    expectIncludes: ["サインイン", "Googleでサインイン"],
    expectExcludes: ["Sign in with Google"],
  },
  {
    label: "?lang=en で Accept-Language を上書き",
    path: "/auth/signin?lang=en",
    headers: { "accept-language": "ja-JP,ja;q=0.9" },
    expectIncludes: ["Sign in"],
    expectExcludes: ["サインイン"],
  },
  {
    label: "?lang=ja で Accept-Language を上書き",
    path: "/auth/signin?lang=ja",
    headers: { "accept-language": "en-US,en;q=0.9" },
    expectIncludes: ["サインイン"],
    expectExcludes: ["Sign in with Google"],
  },
  {
    label: "Cookie NEXT_LOCALE=en で EN",
    path: "/auth/signin",
    headers: { cookie: "NEXT_LOCALE=en" },
    expectIncludes: ["Sign in"],
    expectExcludes: ["サインイン"],
  },
  {
    label: "?lang=en が cookie より優先",
    path: "/auth/signin?lang=en",
    headers: { cookie: "NEXT_LOCALE=ja" },
    expectIncludes: ["Sign in"],
    expectExcludes: ["サインイン"],
  },
];

const PRIVACY_CASES: AssertionCase[] = [
  {
    label: "Accept-Language: en-US → EN Privacy",
    path: "/privacy",
    headers: { "accept-language": "en-US,en;q=0.9" },
    expectIncludes: ["Privacy Policy"],
    expectExcludes: ["プライバシーポリシー"],
  },
  {
    label: "Accept-Language: ja-JP → JA Privacy",
    path: "/privacy",
    headers: { "accept-language": "ja-JP,ja;q=0.9" },
    expectIncludes: ["プライバシーポリシー"],
    expectExcludes: ["Privacy Policy"],
  },
  {
    label: "?lang=en で EN Privacy",
    path: "/privacy?lang=en",
    headers: { "accept-language": "ja-JP" },
    expectIncludes: ["Privacy Policy"],
    expectExcludes: ["プライバシーポリシー"],
  },
  {
    label: "?lang=ja で JA Privacy",
    path: "/privacy?lang=ja",
    headers: { "accept-language": "en-US" },
    expectIncludes: ["プライバシーポリシー"],
    expectExcludes: ["Privacy Policy"],
  },
];

const TERMS_CASES: AssertionCase[] = [
  {
    label: "Accept-Language: en-US → EN Terms",
    path: "/terms",
    headers: { "accept-language": "en-US,en;q=0.9" },
    expectIncludes: ["Terms of Service"],
    expectExcludes: ["利用規約"],
  },
  {
    label: "Accept-Language: ja-JP → JA Terms",
    path: "/terms",
    headers: { "accept-language": "ja-JP,ja;q=0.9" },
    expectIncludes: ["利用規約"],
    expectExcludes: ["Terms of Service"],
  },
  {
    label: "?lang=en で EN Terms",
    path: "/terms?lang=en",
    headers: { "accept-language": "ja-JP" },
    expectIncludes: ["Terms of Service"],
    expectExcludes: ["利用規約"],
  },
];

const MARKETING_CASES: AssertionCase[] = [
  {
    label: "/en LP は EN テキスト",
    path: "/en",
    expectIncludes: ["AI personas", "Reflect"],
    expectExcludes: ["AIが読み解く"],
  },
  {
    label: "/ja LP は JA テキスト",
    path: "/ja",
    expectIncludes: ["AI占い師", "AIが読み解く"],
    expectExcludes: ["Reflect with AI"],
  },
];

// Apple 4.3(b) NG ワード: EN ページのレスポンスに混入していないこと
const NG_WORDS = /\b(fortune|fortune-?telling|predict(ion|s|or)?|horoscope|destiny|fate|zodiac)\b/i;

function runAssertions(
  cases: AssertionCase[],
  group: string,
  checkNgWords: boolean,
) {
  test.describe(group, () => {
    for (const c of cases) {
      test(c.label, async ({ request }) => {
        const res = await request.get(c.path, {
          headers: c.headers,
          maxRedirects: 0,
        });
        // signin はログイン後リダイレクトしないが、Auth.js が UntrustedHost
        // をかます可能性があるので 4xx は許容しない
        expect(
          res.status(),
          `${c.path} が 4xx/5xx (実際: ${res.status()})`,
        ).toBeLessThan(400);

        const body = await res.text();

        for (const expected of c.expectIncludes) {
          expect(
            body.includes(expected),
            `${c.path} に "${expected}" が含まれない`,
          ).toBe(true);
        }
        for (const forbidden of c.expectExcludes) {
          expect(
            body.includes(forbidden),
            `${c.path} に予期しない "${forbidden}" が含まれる`,
          ).toBe(false);
        }

        if (checkNgWords) {
          // <script> タグや serialize された data-* は除外して body の visible
          // text 相当を粗く取り出す。完璧な抽出は不要、混入ゼロを確認できればよい。
          const visible = body
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "");
          const ngMatch = visible.match(NG_WORDS);
          expect(
            ngMatch,
            `${c.path} の EN レスポンスに NG ワード "${ngMatch?.[0]}" が混入`,
          ).toBeNull();
        }
      });
    }
  });
}

runAssertions(SIGNIN_CASES, "サインインページ locale 解決", false);
runAssertions(PRIVACY_CASES, "Privacy ページ locale 解決", false);
runAssertions(TERMS_CASES, "Terms ページ locale 解決", false);
runAssertions(MARKETING_CASES, "マーケティング LP locale", true);

test.describe("Apple 審査員 golden path (Accept-Language: en-US)", () => {
  test("/ → /auth/signin に redirect → EN サインイン", async ({ request }) => {
    const headers = { "accept-language": "en-US,en;q=0.9" };

    // /  は未認証なら /auth/signin に redirect
    const rootRes = await request.get("/", { headers, maxRedirects: 0 });
    expect(rootRes.status(), "/ が redirect を返さない").toBeGreaterThanOrEqual(300);
    expect(rootRes.status(), "/ の redirect status が想定外").toBeLessThan(400);

    const location = rootRes.headers()["location"] ?? "";
    expect(location, "/ → /auth/signin に redirect されない").toContain(
      "/auth/signin",
    );

    // 飛んだ先の /auth/signin が EN
    const signinRes = await request.get("/auth/signin", { headers });
    const body = await signinRes.text();
    expect(body).toContain("Sign in");
    expect(body).not.toContain("サインイン");
  });
});
