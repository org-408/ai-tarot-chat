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
  /** Web 経路: deviceId なし JWT */
  webNoDeviceApiToken: string;
  /** Web 経路: 存在しない deviceId（proxy.ts の `web:${userId}` を模擬） */
  webSyntheticDeviceApiToken: string;
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
  const result = await pool.query<{
    id: string;
    customQuestion: string | null;
    deviceId: string | null;
  }>(
    `SELECT id, "customQuestion", "deviceId" FROM "Reading" WHERE "clientId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
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

async function getAnyTarotCard() {
  const result = await pool.query<{ id: string; code: string }>(
    `SELECT id, code FROM "TarotCard" ORDER BY "createdAt" ASC LIMIT 1`
  );
  return result.rows[0];
}

async function fetchClientReadings(
  request: import("@playwright/test").APIRequestContext,
  token: string
): Promise<{
  readings: Array<{ id: string; clientId: string }>;
  total: number;
}> {
  const res = await request.get("/api/clients/readings", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  return (await res.json()) as {
    readings: Array<{ id: string; clientId: string }>;
    total: number;
  };
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

// ─────────────────────────────────────────────
// スキーマ所有関係リファクタ（PR #178）回帰防止テスト
//
// Reading は Client 所属、Device は optional メタデータ、という仕様が
// 壊れないことを保証する。
// ─────────────────────────────────────────────

test.describe("Reading/ChatMessage 所有関係: Web 経路（Device なし）", () => {
  test("deviceId なし JWT でクイック占いが保存される（deviceId=NULL）", async ({ request }) => {
    const { webNoDeviceApiToken, normalClientId, tarotist, spread, category } = fixtures;

    const messages: UIMessage[] = [u("msg_1", "今日の運勢を占ってください。")];

    const res = await callReadingApi(request, "/api/readings/simple", {
      token: webNoDeviceApiToken,
      messages,
      tarotist,
      spread,
      category,
    });

    expect(res.status()).toBe(200);

    // Reading は保存されている
    const reading = await getLatestReading(normalClientId);
    expect(reading).not.toBeNull();

    // Device は紐付かない
    expect(reading!.deviceId).toBeNull();

    // 利用回数は増加している
    const counts = await getClientCounts(normalClientId);
    expect(counts.dailyReadingsCount).toBe(1);
  });

  test("DB に存在しない deviceId でも保存され、deviceId=NULL になる", async ({ request }) => {
    const { webSyntheticDeviceApiToken, normalClientId, tarotist, spread, category } = fixtures;

    const messages: UIMessage[] = [u("msg_1", "今日の運勢を占ってください。")];

    const res = await callReadingApi(request, "/api/readings/simple", {
      token: webSyntheticDeviceApiToken,
      messages,
      tarotist,
      spread,
      category,
    });

    expect(res.status()).toBe(200);

    const reading = await getLatestReading(normalClientId);
    expect(reading).not.toBeNull();
    // 合成 web:xxx は Device テーブルに無いので紐付かず null で保存される
    expect(reading!.deviceId).toBeNull();
  });
});

test.describe("Reading 履歴 API: cards の復元に必要な情報を返す", () => {
  test("一覧 API は cards.card を含む", async ({ request }) => {
    const { premiumApiToken, premiumClientId, tarotist, spread, category } = fixtures;
    const tarotCard = await getAnyTarotCard();

    await callReadingApi(request, "/api/readings/simple", {
      token: premiumApiToken,
      messages: [u("msg_1", "占ってください。")],
      tarotist,
      spread,
      category,
      drawnCards: [
        {
          id: "drawn_1",
          cardId: tarotCard.id,
          x: 0,
          y: 0,
          order: 0,
          position: "現在",
          description: "現在の状況",
          isHorizontal: false,
          isReversed: false,
          keywords: ["test"],
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const res = await request.get("/api/clients/readings", {
      headers: { Authorization: `Bearer ${premiumApiToken}` },
    });
    expect(res.status()).toBe(200);

    const body = (await res.json()) as {
      readings: Array<{
        clientId: string;
        cards: Array<{ cardId: string; card?: { code?: string } }>;
      }>;
      total: number;
    };

    expect(body.readings.length).toBeGreaterThan(0);
    expect(body.readings[0].clientId).toBe(premiumClientId);
    expect(body.readings[0].cards.length).toBeGreaterThan(0);
    expect(body.readings[0].cards[0].cardId).toBe(tarotCard.id);
    expect(body.readings[0].cards[0].card?.code).toBe(tarotCard.code);
  });

  test("詳細 API は cards.card を含む", async ({ request }) => {
    const { premiumApiToken, premiumClientId, tarotist, spread, category } = fixtures;
    const tarotCard = await getAnyTarotCard();

    await callReadingApi(request, "/api/readings/simple", {
      token: premiumApiToken,
      messages: [u("msg_1", "占ってください。")],
      tarotist,
      spread,
      category,
      drawnCards: [
        {
          id: "drawn_1",
          cardId: tarotCard.id,
          x: 0,
          y: 0,
          order: 0,
          position: "現在",
          description: "現在の状況",
          isHorizontal: false,
          isReversed: true,
          keywords: ["test"],
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const latest = await getLatestReading(premiumClientId);
    expect(latest).not.toBeNull();

    const res = await request.get(`/api/clients/readings/${latest!.id}`, {
      headers: { Authorization: `Bearer ${premiumApiToken}` },
    });
    expect(res.status()).toBe(200);

    const body = (await res.json()) as {
      id: string;
      cards: Array<{ cardId: string; card?: { code?: string } }>;
    };

    expect(body.id).toBe(latest!.id);
    expect(body.cards.length).toBeGreaterThan(0);
    expect(body.cards[0].cardId).toBe(tarotCard.id);
    expect(body.cards[0].card?.code).toBe(tarotCard.code);
  });
});

test.describe("Reading/ChatMessage 所有関係: スキーマ整合性", () => {
  test("ChatMessage.clientId は Reading.clientId と一致する（required 冗長キーの整合性）", async ({ request }) => {
    const { normalApiToken, normalClientId, tarotist, spread, category } = fixtures;

    await callReadingApi(request, "/api/readings/simple", {
      token: normalApiToken,
      messages: [u("msg_1", "占ってください。")],
      tarotist,
      spread,
      category,
    });

    const reading = await getLatestReading(normalClientId);
    expect(reading).not.toBeNull();

    const result = await pool.query<{ clientId: string }>(
      `SELECT "clientId" FROM "ChatMessage" WHERE "readingId" = $1`,
      [reading!.id]
    );

    expect(result.rows.length).toBeGreaterThan(0);
    // 全 ChatMessage の clientId が Reading.clientId と一致する
    for (const row of result.rows) {
      expect(row.clientId).toBe(normalClientId);
    }
  });

  test("ChatMessage.clientId は NOT NULL 制約で保護されている", async () => {
    // 情報スキーマで NOT NULL を確認
    const result = await pool.query<{ is_nullable: string }>(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_name = 'ChatMessage' AND column_name = 'clientId'`
    );
    expect(result.rows[0]?.is_nullable).toBe("NO");
  });

  test("ChatMessage テーブルから deviceId カラムが削除されている", async () => {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM information_schema.columns
       WHERE table_name = 'ChatMessage' AND column_name = 'deviceId'`
    );
    expect(parseInt(result.rows[0].count, 10)).toBe(0);
  });

  test("Reading.deviceId は nullable 制約になっている", async () => {
    const result = await pool.query<{ is_nullable: string }>(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_name = 'Reading' AND column_name = 'deviceId'`
    );
    expect(result.rows[0]?.is_nullable).toBe("YES");
  });

  test("Reading.clientId は NOT NULL 制約で保護されている", async () => {
    const result = await pool.query<{ is_nullable: string }>(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_name = 'Reading' AND column_name = 'clientId'`
    );
    expect(result.rows[0]?.is_nullable).toBe("NO");
  });
});

test.describe("履歴 API: Client 中心の取得", () => {
  // 履歴取得は Plan.hasHistory=true 必須のため PREMIUM ユーザーで検証する。
  // 読み取り条件は client 所有を前提とし、deviceId の有無には依存しない。

  test("client 配下の Reading を /api/clients/readings で取得できる", async ({ request }) => {
    const { premiumApiToken, premiumClientId, tarotist, spread, category } = fixtures;

    const saveRes = await callReadingApi(request, "/api/readings/simple", {
      token: premiumApiToken,
      messages: [u("msg_1", "占ってください。")],
      tarotist,
      spread,
      category,
    });
    expect(saveRes.status()).toBe(200);

    await expect
      .poll(async () => {
        const body = await fetchClientReadings(request, premiumApiToken);
        return body.readings.length;
      })
      .toBeGreaterThan(0);

    const body = await fetchClientReadings(request, premiumApiToken);

    expect(body.readings.length).toBeGreaterThan(0);
    const latest = body.readings[0];
    expect(latest.clientId).toBe(premiumClientId);
  });
});
