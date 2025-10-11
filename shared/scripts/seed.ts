/**
 * Seed Script (共通)
 *
 * 配置: root/shared/scripts/seed.ts
 * 実行方法:
 *   web:    cd web && npm run db:seed
 *   mobile: cd mobile && npm run db:seed
 */

import { readFileSync } from "fs";
import { join } from "path";

// 実行環境判定（引数で指定）
const env = process.argv[2] || "web"; // 'web' or 'mobile'

// 環境に応じて Service を動的にインポート
const getMasterDataService = async () => {
  if (env === "web") {
    // Web (Prisma)
    const { masterDataService } = await import("../../web/lib/services/seed");
    return masterDataService;
  } else {
    // Mobile (SQLite)
    const { masterDataService } = await import(
      "../../mobile/src/lib/services/seed"
    );
    return masterDataService;
  }
};

// CSV/JSON ファイルを fs で読み込み
const docsPath = join(__dirname, "../../docs");
const tarotistCsv = readFileSync(join(docsPath, "tarotists_data.csv"), "utf-8");
const spreadsCsv = readFileSync(
  join(docsPath, "tarot-spreads-matrix.csv"),
  "utf-8"
);
const tarotJsonJa = readFileSync(
  join(docsPath, "tarot_data_dictionary_ja.json"),
  "utf-8"
);

// ==================== Plans データ ====================
const plans = [
  {
    no: 1,
    code: "GUEST",
    name: "ゲスト",
    description: "簡単なタロットリーディングを無料で体験",
    price: 0,
    requiresAuth: false,
    features: [
      "ユーザー登録なしでお気軽に体験",
      "1日1回のみ利用可能",
      "基本スプレッド(3種類)",
      "恋愛・仕事・今日の運勢",
      "広告表示あり",
    ],
    maxReadings: 1,
    maxCeltics: 0,
    maxPersonal: 0,
    hasPersonal: false,
    hasHistory: false,
    isActive: true,
    primaryColor: "#FAFAFA",
    secondaryColor: "#F3F4F6",
    accentColor: "#9CA3AF",
  },
  {
    no: 2,
    code: "FREE",
    name: "フリー",
    description: "占い回数が少し増え、占った履歴も残せます",
    price: 0,
    requiresAuth: true,
    features: [
      "ユーザー登録でさらに楽しめます",
      "1日3回まで利用可能",
      "占い履歴を保存可能",
      "基本スプレッド(3種類)",
      "恋愛・仕事・今日の運勢",
      "広告表示あり",
    ],
    maxReadings: 3,
    maxCeltics: 0,
    maxPersonal: 0,
    hasPersonal: false,
    hasHistory: true,
    isActive: true,
    primaryColor: "#F0FDF4",
    secondaryColor: "#86EFAC",
    accentColor: "#22C55E",
  },
  {
    no: 3,
    code: "STANDARD",
    name: "スタンダード",
    description: "多彩な占いカテゴリとスプレッドを体験。広告なしで快適に",
    price: 480,
    requiresAuth: true,
    features: [
      "多彩な占いカテゴリ",
      "1日3回7枚以内スプレッドが利用可能",
      "または、1日1回ケルト十字が利用可能",
      "占い履歴を保存可能",
      "広告表示なし",
    ],
    maxReadings: 3,
    maxCeltics: 1,
    maxPersonal: 0,
    hasPersonal: false,
    hasHistory: true,
    isActive: true,
    primaryColor: "#EFF6FF",
    secondaryColor: "#BFDBFE",
    accentColor: "#3B82F6",
  },
  {
    no: 4,
    code: "PREMIUM",
    name: "プレミアム",
    description: "占う内容の入力と詳細な解説、簡単な対話を提供",
    price: 980,
    requiresAuth: true,
    features: [
      "多彩な占いカテゴリ",
      "1日3回まですべてのスプレッドが利用可能",
      "1日1回パーソナル占いが利用可能",
      "*パーソナル占いでは、占う内容の入力、結果への質問が可能",
      "占い履歴を保存可能",
      "広告表示なし",
    ],
    maxReadings: 3,
    maxCeltics: 3,
    maxPersonal: 1,
    hasPersonal: true,
    hasHistory: true,
    isActive: true,
    primaryColor: "#FEFCE8",
    secondaryColor: "#FDE047",
    accentColor: "#EAB308",
  },
  {
    no: 5,
    code: "MASTER",
    name: "マスター",
    description: "詳細な解説と全スプレッド、詳細な対話を提供",
    price: 1980,
    requiresAuth: true,
    features: [
      "最上級レベルまでのすべてのスプレッド",
      "多彩な占いカテゴリ",
      "1日3回まですべてのスプレッドが利用可能",
      "1日1回詳細パーソナル占いが利用可能(TBD)",
      "*詳細パーソナル占いでは、占う内容・ユーザー状況の入力、結果への質問が可能",
      "占い履歴を保存可能",
      "広告表示なし",
    ],
    maxReadings: 3,
    maxCeltics: 3,
    maxPersonal: 1,
    hasPersonal: true,
    hasHistory: true,
    isActive: false,
    primaryColor: "#FAF5FF",
    secondaryColor: "#E9D5FF",
    accentColor: "#A855F7",
  },
];

// ==================== Levels データ ====================
const levels = [
  {
    code: "BEGINNER",
    name: "初心者",
    description: "タロット初心者でも簡単に使えるシンプルなスプレッド",
  },
  {
    code: "MEDIUM",
    name: "中級者",
    description: "基本を理解している方向けの少し複雑なスプレッド",
  },
  {
    code: "ADVANCED",
    name: "上級者",
    description: "タロットの知識が豊富な方向けの複雑なスプレッド",
  },
  {
    code: "EXPERT",
    name: "最上級",
    description: "熟練者向けの高度な分析が必要な複雑なスプレッド",
  },
];

// ==================== Cells データ（全26スプレッド分）====================
const cells = [
  // 1. ワンカード (1枚)
  { x: 0, y: 0, vLabel: "占う対象", vOrder: 1 },

  // 2. 3枚引き（Past/Present/Future）(3枚)
  { x: 0, y: 0, vLabel: "過去", vOrder: 1 },
  { x: 1, y: 0, vLabel: "現在", vOrder: 2 },
  { x: 2, y: 0, vLabel: "未来", vOrder: 3 },

  // 3. 3枚引き（Situation/Action/Outcome）(3枚)
  { x: 0, y: 0, vLabel: "状況", vOrder: 1 },
  { x: 1, y: 0, vLabel: "行動", vOrder: 2 },
  { x: 2, y: 0, vLabel: "結果", vOrder: 3 },

  // ... 残りの cells は元の seed.ts から取得（省略）
  // 実際には全26スプレッド分のセル定義が必要
];

// ==================== Main Function ====================

export async function main() {
  console.log(`🌱 環境: ${env}`);

  const masterDataService = await getMasterDataService();

  console.log("🔄 Seeding master data...");

  await masterDataService.seedAll(
    plans,
    levels,
    cells,
    tarotistCsv,
    spreadsCsv,
    tarotJsonJa
  );

  console.log("✅ Seeding completed.");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
