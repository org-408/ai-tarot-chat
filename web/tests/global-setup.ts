/**
 * Playwright グローバルセットアップ
 *
 * 認証済みテスト用の storageState を生成する。
 *
 * 【通常ユーザー】
 * - テスト用 User + Client を DB に upsert
 * - @auth/core/jwt の encode で有効なセッション JWT を生成
 * - tests/.auth/app.json に cookie 付き storageState を保存
 *
 * 【管理者ユーザー】
 * - テスト用 AdminUser を DB に upsert（activatedAt をセット）
 * - admin-auth 用 JWT を生成
 * - tests/.auth/admin.json に cookie 付き storageState を保存
 *
 * 実行タイミング: playwright.config.ts の globalSetup に指定
 * 依存: DATABASE_URL / AUTH_SECRET 環境変数
 *
 * Note: PrismaClient は Prisma v7 の ESM 生成物を Playwright の CJS ランナーが
 * 読み込めないため、pg を使って直接 SQL を発行する。
 */

import { encode } from "@auth/core/jwt";
import { SignJWT } from "jose";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

// auth.ts で明示設定されているクッキー名
const SESSION_COOKIE_NAME = "__Secure-authjs.session-token";
// admin-auth.ts で明示設定されているクッキー名
const ADMIN_SESSION_COOKIE_NAME = "__Secure-admin-authjs.session-token";

const STORAGE_STATE_PATH = path.join(__dirname, ".auth/app.json");
const ADMIN_STORAGE_STATE_PATH = path.join(__dirname, ".auth/admin.json");
const FIXTURES_PATH = path.join(__dirname, ".auth/fixtures.json");

const TEST_USER_EMAIL = "e2e-test@ariadne-ai.app";
const TEST_PREMIUM_USER_EMAIL = "e2e-premium@ariadne-ai.app";
const TEST_ADMIN_EMAIL = "e2e-admin@ariadne-ai.app";

export default async function globalSetup() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET env var is required for global-setup");

    // ── 通常ユーザーセットアップ ──────────────────────────

    // 1. テスト用 User を upsert
    const userResult = await pool.query<{ id: string }>(
      `INSERT INTO "User" (id, name, email, email_verified, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW()
       RETURNING id`,
      ["E2E Test User", TEST_USER_EMAIL]
    );
    const userId = userResult.rows[0].id;

    // 2. FREE プランを取得
    const planResult = await pool.query<{ id: string }>(
      `SELECT id FROM "Plan" WHERE code = 'FREE' LIMIT 1`
    );
    if (planResult.rows.length === 0) {
      throw new Error("FREE plan not found in DB. Run db:seed first.");
    }
    const planId = planResult.rows[0].id;

    // 3. Client を upsert
    await pool.query(
      `INSERT INTO "Client" (id, "userId", name, email, "planId", "isRegistered", "dailyReadingsCount", "dailyPersonalCount", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, true, 0, 0, NOW(), NOW())
       ON CONFLICT ("userId") DO NOTHING`,
      [userId, "E2E Test User", TEST_USER_EMAIL, planId]
    );

    // 4. Auth.js JWT を生成
    const token = await encode({
      token: {
        sub: userId,
        id: userId,
        name: "E2E Test User",
        email: TEST_USER_EMAIL,
        role: "USER",
        provider: "google",
      },
      secret,
      salt: SESSION_COOKIE_NAME,
      maxAge: 24 * 60 * 60,
    });

    // 5. 通常ユーザー storageState を保存
    fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
    fs.writeFileSync(
      STORAGE_STATE_PATH,
      JSON.stringify({
        cookies: [
          {
            name: SESSION_COOKIE_NAME,
            value: token,
            domain: "localhost",
            path: "/",
            expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
            httpOnly: true,
            secure: true,
            sameSite: "None",
          },
        ],
        origins: [],
      })
    );

    // normalClientId を取得
    const normalClientResult = await pool.query<{ id: string }>(
      `SELECT id FROM "Client" WHERE "userId" = $1 LIMIT 1`,
      [userId]
    );
    const normalClientId = normalClientResult.rows[0].id;

    console.log(`✅ E2E test user ready: ${userId} (${TEST_USER_EMAIL})`);

    // ── プレミアムユーザーセットアップ ─────────────────────

    // PREMIUM プランを取得
    const premiumPlanResult = await pool.query<{ id: string }>(
      `SELECT id FROM "Plan" WHERE code = 'PREMIUM' LIMIT 1`
    );
    if (premiumPlanResult.rows.length === 0) {
      throw new Error("PREMIUM plan not found in DB. Run db:seed first.");
    }
    const premiumPlanId = premiumPlanResult.rows[0].id;

    // プレミアム User を upsert
    const premiumUserResult = await pool.query<{ id: string }>(
      `INSERT INTO "User" (id, name, email, email_verified, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW()
       RETURNING id`,
      ["E2E Premium User", TEST_PREMIUM_USER_EMAIL]
    );
    const premiumUserId = premiumUserResult.rows[0].id;

    // プレミアム Client を upsert
    await pool.query(
      `INSERT INTO "Client" (id, "userId", name, email, "planId", "isRegistered", "dailyReadingsCount", "dailyPersonalCount", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, true, 0, 0, NOW(), NOW())
       ON CONFLICT ("userId") DO NOTHING`,
      [premiumUserId, "E2E Premium User", TEST_PREMIUM_USER_EMAIL, premiumPlanId]
    );

    const premiumClientResult = await pool.query<{ id: string }>(
      `SELECT id FROM "Client" WHERE "userId" = $1 LIMIT 1`,
      [premiumUserId]
    );
    const premiumClientId = premiumClientResult.rows[0].id;

    console.log(`✅ E2E premium user ready: ${premiumUserId} (${TEST_PREMIUM_USER_EMAIL})`);

    // ── Device レコード作成（API 認証用）────────────────────

    const normalDeviceId = "e2e-device-normal";
    const premiumDeviceId = "e2e-device-premium";

    await pool.query(
      `INSERT INTO "Device" (id, "deviceId", "clientId", platform, "lastSeenAt", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, 'web', NOW(), NOW(), NOW())
       ON CONFLICT ("deviceId") DO UPDATE SET "clientId" = EXCLUDED."clientId", "updatedAt" = NOW()`,
      [normalDeviceId, normalClientId]
    );
    await pool.query(
      `INSERT INTO "Device" (id, "deviceId", "clientId", platform, "lastSeenAt", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, 'web', NOW(), NOW(), NOW())
       ON CONFLICT ("deviceId") DO UPDATE SET "clientId" = EXCLUDED."clientId", "updatedAt" = NOW()`,
      [premiumDeviceId, premiumClientId]
    );

    // ── API JWT 生成（readings API 用 Bearer トークン）────────

    const jwtSecret = new TextEncoder().encode(secret);

    const normalApiToken = await new SignJWT({
      t: "app",
      clientId: normalClientId,
      deviceId: normalDeviceId,
      provider: "google",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(jwtSecret);

    const premiumApiToken = await new SignJWT({
      t: "app",
      clientId: premiumClientId,
      deviceId: premiumDeviceId,
      provider: "google",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(jwtSecret);

    // Web 経路: deviceId なし JWT（proxy.ts の NextAuth セッション経路を模擬）
    const webNoDeviceApiToken = await new SignJWT({
      t: "app",
      clientId: normalClientId,
      provider: "google",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(jwtSecret);

    // Web 経路: 存在しない deviceId（proxy.ts が生成する合成 `web:${userId}`）
    const webSyntheticDeviceApiToken = await new SignJWT({
      t: "app",
      clientId: normalClientId,
      deviceId: `web:${userId}`,
      provider: "google",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(jwtSecret);

    // ── テスト用マスターデータを取得 ─────────────────────────

    const tarotistResult = await pool.query<{
      id: string; name: string; title: string; trait: string; bio: string; provider: string; model: string;
    }>(`SELECT id, name, title, trait, bio, provider, model FROM "Tarotist" LIMIT 1`);
    if (tarotistResult.rows.length === 0) {
      throw new Error("No Tarotist found. Run db:seed first.");
    }

    const spreadResult = await pool.query<{
      id: string; code: string; name: string; no: number; guide: string;
    }>(`SELECT id, code, name, no, guide FROM "Spread" LIMIT 1`);
    if (spreadResult.rows.length === 0) {
      throw new Error("No Spread found. Run db:seed first.");
    }

    const categoryResult = await pool.query<{
      id: string; name: string; no: number;
    }>(`SELECT id, name, no FROM "ReadingCategory" LIMIT 1`);
    if (categoryResult.rows.length === 0) {
      throw new Error("No ReadingCategory found. Run db:seed first.");
    }

    // ── フィクスチャ保存 ──────────────────────────────────────

    fs.writeFileSync(
      FIXTURES_PATH,
      JSON.stringify({
        normalApiToken,
        normalClientId,
        premiumApiToken,
        premiumClientId,
        webNoDeviceApiToken,
        webSyntheticDeviceApiToken,
        tarotist: tarotistResult.rows[0],
        spread: spreadResult.rows[0],
        category: categoryResult.rows[0],
      }, null, 2)
    );

    console.log(`✅ E2E readings fixtures saved`);

    // ── 管理者ユーザーセットアップ ───────────────────────

    // 6. テスト用 AdminUser を upsert（activatedAt をセットして有効な管理者にする）
    const adminResult = await pool.query<{ id: string }>(
      `INSERT INTO "AdminUser" (id, name, email, "emailVerified", "activatedAt", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW(), NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, "activatedAt" = NOW(), "updatedAt" = NOW()
       RETURNING id`,
      ["E2E Admin User", TEST_ADMIN_EMAIL]
    );
    const adminUserId = adminResult.rows[0].id;

    // 7. 管理者用 JWT を生成（admin-auth.ts の JWT/session コールバックに合わせる）
    const adminToken = await encode({
      token: {
        sub: adminUserId,
        adminUserId: adminUserId,
        name: "E2E Admin User",
        email: TEST_ADMIN_EMAIL,
      },
      secret,
      salt: ADMIN_SESSION_COOKIE_NAME,
      maxAge: 24 * 60 * 60,
    });

    // 8. 管理者 storageState を保存
    fs.writeFileSync(
      ADMIN_STORAGE_STATE_PATH,
      JSON.stringify({
        cookies: [
          {
            name: ADMIN_SESSION_COOKIE_NAME,
            value: adminToken,
            domain: "localhost",
            path: "/",
            expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
            httpOnly: true,
            secure: true,
            sameSite: "None",
          },
        ],
        origins: [],
      })
    );

    console.log(`✅ E2E admin user ready: ${adminUserId} (${TEST_ADMIN_EMAIL})`);
  } finally {
    await pool.end();
  }
}
