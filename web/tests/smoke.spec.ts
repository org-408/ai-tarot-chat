import { test, expect } from "@playwright/test";

const PAGES = [
  { name: "marketing top", path: "/" },
  { name: "web service top", path: "/ja/salon" },
  { name: "admin", path: "/admin" },
];

for (const { name, path } of PAGES) {
  test(`${name}: TypeError がないこと`, async ({ page }) => {
    const typeErrors: string[] = [];

    // TypeError のみ捕捉（(void 0) is not a function 等の JSX runtime クラッシュが対象）
    // DB 未接続・認証エラー等のサーバーサイドエラーは対象外
    page.on("pageerror", (err) => {
      if (err.name === "TypeError" || err.message.toLowerCase().startsWith("typeerror")) {
        typeErrors.push(err.message);
      }
    });

    await page.goto(path);
    await page.waitForLoadState("networkidle");

    expect(
      typeErrors,
      `ページ ${path} で JS エラーが発生:\n${typeErrors.join("\n")}`
    ).toHaveLength(0);
  });
}
