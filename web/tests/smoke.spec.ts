import { test, expect } from "@playwright/test";

const PAGES = [
  { name: "marketing top", path: "/" },
  { name: "web service top", path: "/ja/salon" },
  { name: "admin", path: "/admin" },
];

for (const { name, path } of PAGES) {
  test(`${name}: TypeError がないこと`, async ({ page }) => {
    const typeErrors: string[] = [];

    // 未処理の JS エラーを捕捉（(void 0) is not a function はここに出る）
    page.on("pageerror", (err) => {
      typeErrors.push(err.message);
    });

    await page.goto(path);
    await page.waitForLoadState("networkidle");

    expect(
      typeErrors,
      `ページ ${path} で JS エラーが発生:\n${typeErrors.join("\n")}`
    ).toHaveLength(0);
  });
}
