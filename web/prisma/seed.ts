import { Prisma, PrismaClient } from "@/lib/generated/prisma";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// プランの作成
const plans: Prisma.PlanCreateInput[] = [
  {
    code: "FREE",
    name: "フリー",
    description: "基本的なタロットリーディングを無料で体験",
    price: 0,
    features: ["基本スプレッド", "簡易解釈"],
    maxReadings: 3,
    hasAICoach: false,
  },
  {
    code: "STANDARD",
    name: "スタンダード",
    description: "詳細な解釈と多様なスプレッドを提供",
    price: 480,
    features: ["中級レベルまでのすべてのスプレッド", "詳細解釈", "履歴保存"],
    maxReadings: null, // 無制限
    hasAICoach: false,
  },
  {
    code: "COACH",
    name: "コーチング",
    description: "AIによる詳細な解説とアドバイスを提供",
    price: 980,
    features: [
      "上級レベルまでのすべてのスプレッド",
      "AIコーチング",
      "無制限履歴",
      "高度な解釈",
    ],
    maxReadings: null, // 無制限
    hasAICoach: true,
  },
  {
    code: "MASTER",
    name: "マスター",
    description: "AIによるプロレベルの詳細な解説とアドバイスを提供",
    price: 2980,
    features: [
      "すべてのスプレッド",
      "プロレベルのAIコーチング",
      "無制限履歴",
      "高度な解釈",
    ],
    maxReadings: null, // 無制限
    hasAICoach: true,
  },
];

// スプレッドレベルの作成
const levels: Prisma.SpreadLevelCreateInput[] = [
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

// 優先度をABCDの文字列からPriorityタイプに変換する関数
function parsePriority(priority: string): string | null {
  const match = priority.match(/\*\*([A-D])\*\*/);
  return match ? match[1] : null;
}

// 星評価を★の数から数値に変換する関数
function parseStarRating(stars: string): number | null {
  const fullStars = (stars.match(/★/g) || []).length;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const halfStars = (stars.match(/☆/g) || []).length;
  return fullStars > 0 ? fullStars : null;
}

// プラン名を正規化する関数
function normalizePlan(plan: string): string {
  const planMap: Record<string, string> = {
    Free: "FREE",
    Standard: "STANDARD",
    Coach: "COACH",
    Master: "MASTER",
  };
  return planMap[plan] || "FREE";
}

// レベル名を正規化する関数
function normalizeLevel(level: string): string {
  const levelMap: Record<string, string> = {
    初心者: "BEGINNER",
    中級: "MEDIUM",
    中級者: "MEDIUM",
    上級: "ADVANCED",
    上級者: "ADVANCED",
    最上級: "EXPERT",
  };
  return levelMap[level] || "BEGINNER";
}

// カテゴリ文字列をカテゴリ配列に変換する関数
function parseCategories(categoryString: string): string[] {
  return categoryString
    .split("・")
    .map((cat) => cat.trim())
    .filter(Boolean);
}

// マークダウンのテーブルを解析してスプレッドデータを抽出する関数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseMarkdownTable(mdContent: string): Promise<any[]> {
  const lines = mdContent.split("\n");
  const tableLines = lines.filter(
    (line) => line.trim().startsWith("|") && !line.includes("---")
  );

  // ヘッダー行を除外
  const dataLines = tableLines.slice(2);

  const spreads = [];

  for (const line of dataLines) {
    const columns = line
      .split("|")
      .map((col) => col.trim())
      .filter(Boolean);
    if (columns.length < 12) continue;

    const [
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      number,
      name,
      code,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      cardCount,
      categoryString,
      level,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      meanings,
      popularity,
      practicality,
      beginnerFriendly,
      requiresDialog,
      plan,
      priority,
      guide,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      comment,
    ] = columns;

    // **文字列** 形式からプレーンテキストに変換
    const cleanName = name.replace(/\*\*/g, "");

    const spreadData = {
      name: cleanName,
      code: code,
      categoryString: categoryString,
      categories: parseCategories(categoryString),
      level: normalizeLevel(level),
      plan: normalizePlan(plan),
      guide: guide,
      requiresDialog: requiresDialog.includes("必須"),
      popularity: parseStarRating(popularity),
      practicality: parseStarRating(practicality),
      beginnerFriendly: parseStarRating(beginnerFriendly),
      priority: parsePriority(priority),
    };

    spreads.push(spreadData);
  }

  return spreads;
}

async function importSpreads() {
  try {
    console.log("🌱 スプレッドデータのインポートを開始します...");

    // マークダウンファイルの読み込み
    const mdPath = path.join(
      __dirname,
      "..",
      "..",
      "docs",
      "tarot_spread_matrix.md"
    );
    const mdContent = fs.readFileSync(mdPath, "utf-8");

    // マークダウンを解析してスプレッドデータを抽出
    const spreads = await parseMarkdownTable(mdContent);

    for (const spreadData of spreads) {
      const update = {
        name: spreadData.name.trim(),
        category: spreadData.categoryString.trim(),
        level: { connect: { code: spreadData.level } },
        plan: { connect: { code: spreadData.plan } },
        guide: spreadData.guide,
        // requiresDialog: spreadData.requiresDialog,
        // popularity: spreadData.popularity,
        // practicality: spreadData.practicality,
        // beginnerFriendly: spreadData.beginnerFriendly,
        // priority: spreadData.priority,
        // 新規作成時のカテゴリ関連
        categories: {
          create: spreadData.categories.map((cat: string) => ({
            category: {
              connectOrCreate: {
                where: { name: cat },
                create: {
                  name: cat,
                  description: `${cat}に関するタロットリーディング`,
                },
              },
            },
          })),
        },
      };
      const create = { code: spreadData.code, ...update };

      // スプレッドをupsert
      await prisma.spread.upsert({
        where: {
          code: spreadData.code, // codeをユニーク制約として使用
        },
        update,
        create,
      });
    }
  } catch (error) {
    console.error("❌ インポート中にエラーが発生しました:", error);
  } finally {
    await prisma.$disconnect();
  }
}

export async function main() {
  // plans
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {},
      create: plan,
    });
  }

  // levels
  for (const level of levels) {
    await prisma.spreadLevel.upsert({
      where: { code: level.code },
      update: {},
      create: level,
    });
  }

  await importSpreads();

  console.log("Seeding completed.");
}

main();
