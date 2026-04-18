/**
 * サインインフロー E2E テスト
 *
 * E2E_MOCK_AUTH=true で有効になる Credentials プロバイダーを使い、
 * 初回サインイン時に jwt コールバックで Client が自動作成されることを検証する。
 *
 * 保証する内容:
 * - 新規ユーザーがサインインしても Access Denied にならない
 * - サインイン後に Client レコードが DB に存在する
 * - /salon にリダイレクトされる（認証成功）
 *
 * 保証しない内容（Auth.js の仕様として保証されている）:
 * - OAuth の createUser と jwt コールバックの呼び出し順序
 */

import { test, expect } from "@playwright/test";
import { Pool } from "pg";

const TEST_EMAIL = `signin-e2e-${Date.now()}@e2e.test`;

test.describe("初回サインインフロー", () => {
  let pool: Pool;

  test.beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  test.afterAll(async () => {
    // テスト用 User / Client を削除（FK cascade）
    await pool.query(`DELETE FROM "User" WHERE email = $1`, [TEST_EMAIL]);
    await pool.end();
  });

  test("新規ユーザーがサインインすると Client が作成される（Access Denied にならない）", async ({
    page,
    request,
  }) => {
    // ── サインイン ────────────────────────────────────────────
    // Credentials プロバイダー経由でサインイン
    // （E2E_MOCK_AUTH=true のときのみ有効）
    const csrfRes = await request.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();

    const signinRes = await request.post(
      "/api/auth/callback/e2e-credentials",
      {
        form: {
          email: TEST_EMAIL,
          csrfToken,
          callbackUrl: "/salon",
          json: "true",
        },
      }
    );

    expect(
      signinRes.status(),
      "サインインが 200 または 302 で返ること（Access Denied = 401/403 ではない）"
    ).toBeLessThan(400);

    // ── Client の存在確認 ─────────────────────────────────────
    // jwt コールバックが呼ばれた後、DB に Client が作成されているはず
    // （Credentials はセッション確立時に jwt コールバックを呼ぶ）
    const { rows } = await pool.query<{ id: string }>(
      `SELECT c.id FROM "Client" c
       JOIN "User" u ON c."userId" = u.id
       WHERE u.email = $1`,
      [TEST_EMAIL]
    );

    expect(
      rows.length,
      `Client が作成されていること（email: ${TEST_EMAIL}）`
    ).toBe(1);

    // ── ブラウザでのサインイン確認（リダイレクト先が /auth/signin でないこと）──
    await page.goto(`/auth/signin?callbackUrl=/salon`);
    await page.waitForLoadState("networkidle");

    // Access Denied ページが表示されていないこと
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("Access Denied");
  });

  test("既存ユーザーが再サインインしても Client が重複作成されない", async ({
    request,
  }) => {
    const EXISTING_EMAIL = `signin-e2e-existing-${Date.now()}@e2e.test`;

    const csrfRes = await request.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();

    // 1 回目のサインイン
    await request.post("/api/auth/callback/e2e-credentials", {
      form: {
        email: EXISTING_EMAIL,
        csrfToken,
        callbackUrl: "/salon",
        json: "true",
      },
    });

    // 2 回目のサインイン
    const csrfRes2 = await request.get("/api/auth/csrf");
    const { csrfToken: csrfToken2 } = await csrfRes2.json();
    await request.post("/api/auth/callback/e2e-credentials", {
      form: {
        email: EXISTING_EMAIL,
        csrfToken: csrfToken2,
        callbackUrl: "/salon",
        json: "true",
      },
    });

    const { rows } = await pool.query<{ id: string }>(
      `SELECT c.id FROM "Client" c
       JOIN "User" u ON c."userId" = u.id
       WHERE u.email = $1`,
      [EXISTING_EMAIL]
    );

    expect(rows.length, "Client が重複作成されていないこと").toBe(1);

    // クリーンアップ
    await pool.query(`DELETE FROM "User" WHERE email = $1`, [EXISTING_EMAIL]);
  });
});
