/**
 * リーディング保存・利用回数 E2E テスト
 *
 * E2E_MOCK_AI=true のサーバーに対して API を直接呼び出し、
 * DB にリーディング結果が保存され利用回数が増加することを検証する。
 *
 * 事前条件:
 * - globalSetup で生成した tests/.auth/fixtures.json が存在すること
 * - サーバーが E2E_MOCK_AI=true で起動していること
 *   (playwright.config.ts の webServer.env で自動設定、ローカル再利用時は手動設定)
 */

import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

interface FixtureData {
  normalApiToken: string;
  normalClientId: string;
  premiumApiToken: string;
  premiumClientId: string;
  tarotist: {
    id: string;
    name: string;
    title: string;
    trait: string;
    bio: string;
    provider: string;
    model: string;
  };
  spread: {
    id: string;
    code: string;
    name: string;
    no: number;
    guide: string;
  };
  category: {
    id: string;
    name: string;
    no: number;
  };
}

interface UIMessagePart {
  type: "text";
  text: string;
}

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  parts: UIMessagePart[];
}

// ─────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────

function u(id: string, text: string): UIMessage {
  return { id, role: "user", parts: [{ type: "text", text }] };
}

function a(id: string, text: string): UIMessage {
  return { id, role: "assistant", parts: [{ type: "text", text }] };
}

// ─────────────────────────────────────────────
// テスト共有状態
// ─────────────────────────────────────────────

const FIXTURES_PATH = path.join(__dirname, ".auth/fixtures.json");

let fixtures: FixtureData;
let pool: Pool;

test.beforeAll(async () => {
  fixtures = JSON.parse(fs.readFileSync(FIXTURES_PATH, "utf-8")) as FixtureData;
  pool = new Pool({ connectionString: process.env.DATABASE_URL! });
});

test.afterAll(async () => {
  await pool.end();
});

test.beforeEach(async () => {
  // 利用回数をリセット
  await pool.query(
    `UPDATE "Client" SET "dailyReadingsCount" = 0, "lastReadingDate" = NULL WHERE id = $1`,
    [fixtures.normalClientId]
  );
  await pool.query(
    `UPDATE "Client" SET "dailyPersonalCount" = 0, "lastPersonalReadingDate" = NULL WHERE id = $1`,
    [fixtures.premiumClientId]
  );
  // リーディングをクリア（FK 制約のため ChatMessage・DrawnCard を先に削除）
  await pool.query(
    `DELETE FROM "ChatMessage" WHERE "readingId" IN (
      SELECT id FROM "Reading" WHERE "clientId" = ANY($1::text[])
    )`,
    [[fixtures.normalClientId, fixtures.premiumClientId]]
  );
  await pool.query(
    `DELETE FROM "DrawnCard" WHERE "readingId" IN (
      SELECT id FROM "Reading" WHERE "clientId" = ANY($1::text[])
    )`,
    [[fixtures.normalClientId, fixtures.premiumClientId]]
  );
  await pool.query(
    `DELETE FROM "Reading" WHERE "clientId" = ANY($1::text[])`,
    [[fixtures.normalClientId, fixtures.premiumClientId]]
  );
});

// ─────────────────────────────────────────────
// API 呼び出しヘルパー
// ─────────────────────────────────────────────

interface ReadingRequestOptions {
  token: string;
  messages: UIMessage[];
  tarotist: FixtureData["tarotist"];
  spread: FixtureData["spread"];
  category?: FixtureData["category"];
  drawnCards?: unknown[];
  isEndingEarly?: boolean;
  initialLen?: number;
}

async function callReadingApi(
  request: import("@playwright/test").APIRequestContext,
  endpoint: string,
  opts: ReadingRequestOptions
): Promise<import("@playwright/test").APIResponse> {
  return request.post(endpoint, {
    data: {
      messages: opts.messages,
      tarotist: opts.tarotist,
      spread: { ...opts.spread, cells: [] },
      category: opts.category,
      drawnCards: opts.drawnCards ?? [],
      ...(opts.isEndingEarly !== undefined && { isEndingEarly: opts.isEndingEarly }),
      ...(opts.initialLen !== undefined && { initialLen: opts.initialLen }),
    },
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "Content-Type": "application/json",
    },
  });
}

// ─────────────────────────────────────────────
// DB 検証ヘルパー
// ─────────────────────────────────────────────

async function getClientCounts(clientId: string) {
  const result = await pool.query<{
    dailyReadingsCount: number;
    dailyPersonalCount: number;
  }>(
    `SELECT "dailyReadingsCount", "dailyPersonalCount" FROM "Client" WHERE id = $1`,
    [clientId]
  );
  return result.rows[0];
}

async function getLatestReading(clientId: string) {
  const result = await pool.query<{ id: string; "customQuestion": string | null }>(
    `SELECT id, "customQuestion" FROM "Reading" WHERE "clientId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
    [clientId]
  );
  return result.rows[0] ?? null;
}

async function getChatMessageCount(readingId: string) {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM "ChatMessage" WHERE "readingId" = $1`,
    [readingId]
  );
  return parseInt(result.rows[0].count, 10);
}

async function getReadingCount(clientId: string) {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM "Reading" WHERE "clientId" = $1`,
    [clientId]
  );
  return parseInt(result.rows[0].count, 10);
}

// ─────────────────────────────────────────────
// テスト
// ─────────────────────────────────────────────

test.describe("リーディング保存・利用回数テスト", () => {
  /**
   * パターン1: クイック占い
   * - 1回の API コールで占い結果が保存され、dailyReadingsCount が増加する
   */
  test("クイック占い: 結果が保存され利用回数が増加する", async ({ request }) => {
    const { normalApiToken, normalClientId, tarotist, spread, category } = fixtures;

    const messages: UIMessage[] = [
      u("msg_1", "今日の運勢を占ってください。"),
    ];

    const res = await callReadingApi(request, "/api/readings/simple", {
      token: normalApiToken,
      messages,
      tarotist,
      spread,
      category,
    });

    expect(res.status()).toBe(200);

    // DB 検証
    const counts = await getClientCounts(normalClientId);
    expect(counts.dailyReadingsCount).toBe(1);

    const reading = await getLatestReading(normalClientId);
    expect(reading).not.toBeNull();

    // USER_QUESTION × 1 + FINAL_READING × 1 = 2
    const msgCount = await getChatMessageCount(reading!.id);
    expect(msgCount).toBe(2);
  });

  /**
   * パターン2: パーソナル占い（質問1回）
   * - Phase2 初回鑑定で Reading が作成され、dailyPersonalCount が増加する
   * - さらに Q&A 1 回で Reading が更新され、チャット履歴が追加される
   */
  test("パーソナル占い 1問: 結果が保存され利用回数が増加する", async ({ request }) => {
    const { premiumApiToken, premiumClientId, tarotist, spread } = fixtures;

    // Phase1 メッセージ（5件）
    const phase1Messages: UIMessage[] = [
      u("p1_1", "よろしくお願いします。"),
      a("p1_2", "どんなことを占いましょうか？"),
      u("p1_3", "仕事の方向性について占ってください。"),
      a("p1_4", "ケルト十字スプレッドがおすすめです。"),
      u("p1_5", "お願いします。"),
    ];

    // --- Step1: Phase2 初回鑑定 ---
    const res1 = await callReadingApi(request, "/api/readings/personal", {
      token: premiumApiToken,
      messages: phase1Messages,
      tarotist,
      spread,
    });
    expect(res1.status()).toBe(200);

    const counts1 = await getClientCounts(premiumClientId);
    expect(counts1.dailyPersonalCount).toBe(1);

    const reading1 = await getLatestReading(premiumClientId);
    expect(reading1).not.toBeNull();
    expect(reading1!.customQuestion).toBe("仕事の方向性について占ってください。");

    // Phase1(5) + FINAL_READING(1) = 6
    expect(await getChatMessageCount(reading1!.id)).toBe(6);

    // --- Step2: Q&A 1問目 ---
    const phase2AiMsg = a("p2_ai", "カードの解釈です。タロットによると...");
    const qa1Messages: UIMessage[] = [
      ...phase1Messages,
      phase2AiMsg,
      u("qa1_u", "もっと具体的に教えてください。"),
    ];

    const res2 = await callReadingApi(request, "/api/readings/personal", {
      token: premiumApiToken,
      messages: qa1Messages,
      tarotist,
      spread,
      initialLen: phase1Messages.length,
    });
    expect(res2.status()).toBe(200);

    // 利用回数は変わらない（Q&A は increment しない）
    const counts2 = await getClientCounts(premiumClientId);
    expect(counts2.dailyPersonalCount).toBe(1);

    // Reading は 1 件のまま（更新）
    expect(await getReadingCount(premiumClientId)).toBe(1);

    // Phase1(5) + Phase2AI(1) + QA1User(1) + QA1AI_mock(1) = 8
    expect(await getChatMessageCount(reading1!.id)).toBe(8);
  });

  /**
   * パターン3: パーソナル占い（手動クローズ）
   * - Phase2 初回 + Q&A 1問 + 手動クローズで、クロージング応答まで全保存される
   * - 利用回数は初回の +1 のみ
   */
  test("パーソナル占い 手動クローズ: クロージング応答まで全保存される", async ({ request }) => {
    const { premiumApiToken, premiumClientId, tarotist, spread } = fixtures;

    const phase1Messages: UIMessage[] = [
      u("p1_1", "よろしくお願いします。"),
      a("p1_2", "どんなことを占いましょうか？"),
      u("p1_3", "転職のタイミングについて占ってください。"),
      a("p1_4", "ケルト十字スプレッドがおすすめです。"),
      u("p1_5", "お願いします。"),
    ];

    // --- Step1: Phase2 初回鑑定 ---
    const res1 = await callReadingApi(request, "/api/readings/personal", {
      token: premiumApiToken,
      messages: phase1Messages,
      tarotist,
      spread,
    });
    expect(res1.status()).toBe(200);
    expect((await getClientCounts(premiumClientId)).dailyPersonalCount).toBe(1);

    const reading = await getLatestReading(premiumClientId);
    expect(reading).not.toBeNull();
    // Phase1(5) + FINAL_READING(1) = 6
    expect(await getChatMessageCount(reading!.id)).toBe(6);

    const phase2AiMsg = a("p2_ai", "カードの解釈です。");

    // --- Step2: Q&A 1問目 ---
    const qa1Messages: UIMessage[] = [
      ...phase1Messages,
      phase2AiMsg,
      u("qa1_u", "もう少し詳しく教えてください。"),
    ];
    const res2 = await callReadingApi(request, "/api/readings/personal", {
      token: premiumApiToken,
      messages: qa1Messages,
      tarotist,
      spread,
      initialLen: phase1Messages.length,
    });
    expect(res2.status()).toBe(200);
    // Phase1(5) + P2AI(1) + QA1U(1) + QA1AI_mock(1) = 8
    expect(await getChatMessageCount(reading!.id)).toBe(8);

    // --- Step3: 手動クローズ（isEndingEarly=true）---
    const qa1AiMsg = a("qa1_ai", "回答1です。");
    const closingMessages: UIMessage[] = [
      ...qa1Messages,
      qa1AiMsg,
      u("close_u", "ありがとうございました。今日の占いはここで終わりにします。"),
    ];
    const res3 = await callReadingApi(request, "/api/readings/personal", {
      token: premiumApiToken,
      messages: closingMessages,
      tarotist,
      spread,
      initialLen: phase1Messages.length,
      isEndingEarly: true,
    });
    expect(res3.status()).toBe(200);
    // 8 + closingU(1) + closingAI_mock(1) = 10
    expect(await getChatMessageCount(reading!.id)).toBe(10);

    // 利用回数は変わらず 1、Reading は 1 件
    expect((await getClientCounts(premiumClientId)).dailyPersonalCount).toBe(1);
    expect(await getReadingCount(premiumClientId)).toBe(1);
  });

  /**
   * パターン4: パーソナル占い（質問3回）
   * - Phase2 初回 + Q&A 3回で、全会話が Reading に保存される
   * - 利用回数は初回の +1 のみ
   */
  test("パーソナル占い 3問: 全会話が保存され利用回数が1増加する", async ({ request }) => {
    const { premiumApiToken, premiumClientId, tarotist, spread } = fixtures;

    const phase1Messages: UIMessage[] = [
      u("p1_1", "よろしくお願いします。"),
      a("p1_2", "どんなことを占いましょうか？"),
      u("p1_3", "恋愛の行方について占ってください。"),
      a("p1_4", "ラバーズスプレッドがおすすめです。"),
      u("p1_5", "お願いします。"),
    ];

    // --- Step1: Phase2 初回鑑定 ---
    const res1 = await callReadingApi(request, "/api/readings/personal", {
      token: premiumApiToken,
      messages: phase1Messages,
      tarotist,
      spread,
    });
    expect(res1.status()).toBe(200);

    const counts1 = await getClientCounts(premiumClientId);
    expect(counts1.dailyPersonalCount).toBe(1);

    const reading = await getLatestReading(premiumClientId);
    expect(reading).not.toBeNull();
    expect(await getChatMessageCount(reading!.id)).toBe(6);

    const phase2AiMsg = a("p2_ai", "カードの解釈です。");

    // --- Step2: Q&A 1問目 ---
    const qa1Messages: UIMessage[] = [
      ...phase1Messages,
      phase2AiMsg,
      u("qa1_u", "質問1です。"),
    ];
    const res2 = await callReadingApi(request, "/api/readings/personal", {
      token: premiumApiToken,
      messages: qa1Messages,
      tarotist,
      spread,
      initialLen: phase1Messages.length,
    });
    expect(res2.status()).toBe(200);
    // Phase1(5) + P2AI(1) + QA1U(1) + QA1AI_mock(1) = 8
    expect(await getChatMessageCount(reading!.id)).toBe(8);

    // --- Step3: Q&A 2問目 ---
    const qa2Messages: UIMessage[] = [
      ...qa1Messages,
      a("qa1_ai", "回答1です。"),
      u("qa2_u", "質問2です。"),
    ];
    const res3 = await callReadingApi(request, "/api/readings/personal", {
      token: premiumApiToken,
      messages: qa2Messages,
      tarotist,
      spread,
      initialLen: phase1Messages.length,
    });
    expect(res3.status()).toBe(200);
    // 8 + QA2U(1) + QA2AI_mock(1) = 10
    expect(await getChatMessageCount(reading!.id)).toBe(10);

    // --- Step4: Q&A 3問目（最終）---
    const qa3Messages: UIMessage[] = [
      ...qa2Messages,
      a("qa2_ai", "回答2です。"),
      u("qa3_u", "最後の質問です。"),
    ];
    const res4 = await callReadingApi(request, "/api/readings/personal", {
      token: premiumApiToken,
      messages: qa3Messages,
      tarotist,
      spread,
      initialLen: phase1Messages.length,
    });
    expect(res4.status()).toBe(200);
    // 10 + QA3U(1) + QA3AI_mock(1) = 12
    expect(await getChatMessageCount(reading!.id)).toBe(12);

    // 利用回数は変わらず 1
    const finalCounts = await getClientCounts(premiumClientId);
    expect(finalCounts.dailyPersonalCount).toBe(1);

    // Reading は 1 件
    expect(await getReadingCount(premiumClientId)).toBe(1);
  });
});
