/**
 * クイックスモークテスト
 * サーバーが起動してレスポンスを返せるかだけを確認する最低限のテスト。
 * 詳細な全ページテストは pages.spec.ts を参照。
 */

import { test, expect } from "@playwright/test";

test("サーバーが起動しており / がレスポンスを返す", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(500);
});
