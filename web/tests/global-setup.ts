/**
 * Playwright グローバルセットアップ
 *
 * 認証済みテスト用の storageState を生成する。
 * - テスト用 User + Client を DB に upsert
 * - @auth/core/jwt の encode で有効なセッション JWT を生成
 * - tests/.auth/app.json に cookie 付き storageState を保存
 *
 * 実行タイミング: playwright.config.ts の globalSetup に指定
 * 依存: DATABASE_URL / AUTH_SECRET 環境変数
 */

import { encode } from "@auth/core/jwt";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// auth.ts で明示設定されているクッキー名
const SESSION_COOKIE_NAME = "__Secure-authjs.session-token";
const STORAGE_STATE_PATH = path.join(__dirname, ".auth/app.json");

const TEST_USER_EMAIL = "e2e-test@ariadne-ai.app";

export default async function globalSetup() {
  const prisma = new PrismaClient();

  try {
    // ── 1. テスト用 User を upsert ──────────────────────────
    const user = await prisma.user.upsert({
      where: { email: TEST_USER_EMAIL },
      update: { name: "E2E Test User" },
      create: {
        email: TEST_USER_EMAIL,
        name: "E2E Test User",
        emailVerified: new Date(),
      },
    });

    // ── 2. FREE プランを取得 ────────────────────────────────
    const freePlan = await prisma.plan.findUnique({
      where: { code: "FREE" },
    });
    if (!freePlan) throw new Error("FREE plan not found in DB. Run db:seed first.");

    // ── 3. Client を upsert ─────────────────────────────────
    const existingClient = await prisma.client.findUnique({
      where: { userId: user.id },
    });
    if (!existingClient) {
      await prisma.client.create({
        data: {
          user: { connect: { id: user.id } },
          email: TEST_USER_EMAIL,
          name: "E2E Test User",
          plan: { connect: { id: freePlan.id } },
          isRegistered: true,
        },
      });
    }

    // ── 4. Auth.js JWT を生成 ──────────────────────────────
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET env var is required for global-setup");

    const token = await encode({
      token: {
        sub: user.id,
        id: user.id,
        name: "E2E Test User",
        email: TEST_USER_EMAIL,
        role: "USER",
        provider: "google",
      },
      secret,
      salt: SESSION_COOKIE_NAME,
      maxAge: 24 * 60 * 60, // 24 時間
    });

    // ── 5. storageState を保存 ─────────────────────────────
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

    console.log(`✅ E2E test user ready: ${user.id} (${TEST_USER_EMAIL})`);
  } finally {
    await prisma.$disconnect();
  }
}
