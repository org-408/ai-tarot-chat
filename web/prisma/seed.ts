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

const cells: Prisma.SpreadCellCreateInput[] = [
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

  // 4. デイリーガイダンス (3枚)
  { x: 0, y: 0, vLabel: "朝のエネルギー", vOrder: 1 },
  { x: 1, y: 0, vLabel: "午後の課題", vOrder: 2 },
  { x: 2, y: 0, vLabel: "夜の学び", vOrder: 3 },

  // 5. 二択スプレッド (2枚)
  { x: 0, y: 0, vLabel: "選択肢A", vOrder: 1 },
  { x: 1, y: 0, vLabel: "選択肢B", vOrder: 2 },

  // 6. 面接スプレッド (3枚)
  { x: 0, y: 0, vLabel: "あなたの強み", vOrder: 1 },
  { x: 1, y: 0, vLabel: "相手の印象", vOrder: 2 },
  { x: 2, y: 0, vLabel: "結果", vOrder: 3 },

  // 7. 3枚引き（Mind/Body/Spirit）(3枚)
  { x: 0, y: 0, vLabel: "心", vOrder: 1 },
  { x: 1, y: 0, vLabel: "体", vOrder: 2 },
  { x: 2, y: 0, vLabel: "魂", vOrder: 3 },

  // 8. 恋愛三角 (3枚) - 三角形配置
  { x: 1, y: 0, vLabel: "心の状態", vOrder: 1 },
  { x: 0, y: 1, vLabel: "現在の愛", vOrder: 2 },
  { x: 2, y: 1, vLabel: "未来の愛", vOrder: 3 },

  // 9. 復縁スプレッド (4枚)
  { x: 0, y: 0, vLabel: "過去の関係", vOrder: 1 },
  { x: 1, y: 0, vLabel: "現在の状況", vOrder: 2 },
  { x: 2, y: 0, vLabel: "相手の気持ち", vOrder: 3 },
  { x: 3, y: 0, vLabel: "復縁可能性", vOrder: 4 },

  // 10. 5枚スプレッド (5枚) - 十字配置
  { x: 1, y: 0, vLabel: "現在", vOrder: 1 },
  { x: 1, y: 1, vLabel: "課題", vOrder: 2 },
  { x: 0, y: 1, vLabel: "過去", vOrder: 3 },
  { x: 2, y: 1, vLabel: "未来", vOrder: 4 },
  { x: 1, y: 2, vLabel: "アドバイス", vOrder: 5 },

  // 11. 金運予測 (6枚)
  { x: 0, y: 0, vLabel: "現在の状況", vOrder: 1 },
  { x: 1, y: 0, vLabel: "収入", vOrder: 2 },
  { x: 2, y: 0, vLabel: "支出", vOrder: 3 },
  { x: 0, y: 1, vLabel: "投資運", vOrder: 4 },
  { x: 1, y: 1, vLabel: "節約法", vOrder: 5 },
  { x: 2, y: 1, vLabel: "金運", vOrder: 6 },

  // 12. ソウルメイト (5枚)
  { x: 0, y: 0, vLabel: "現状", vOrder: 1 },
  { x: 1, y: 0, vLabel: "準備度", vOrder: 2 },
  { x: 2, y: 0, vLabel: "出会い方", vOrder: 3 },
  { x: 3, y: 0, vLabel: "相手像", vOrder: 4 },
  { x: 4, y: 0, vLabel: "時期", vOrder: 5 },

  // 13. マネーブロック解除 (5枚)
  { x: 0, y: 0, vLabel: "現状", vOrder: 1 },
  { x: 1, y: 0, vLabel: "原因", vOrder: 2 },
  { x: 2, y: 0, vLabel: "ブロック", vOrder: 3 },
  { x: 3, y: 0, vLabel: "解決法", vOrder: 4 },
  { x: 4, y: 0, vLabel: "成功後", vOrder: 5 },

  // 14. キャリアパス (7枚)
  { x: 0, y: 0, vLabel: "現状", vOrder: 1 },
  { x: 1, y: 0, vLabel: "課題", vOrder: 2 },
  { x: 2, y: 0, vLabel: "強み", vOrder: 3 },
  { x: 3, y: 0, vLabel: "長期目標", vOrder: 4 },
  { x: 0, y: 1, vLabel: "行動", vOrder: 5 },
  { x: 1, y: 1, vLabel: "機会", vOrder: 6 },
  { x: 2, y: 1, vLabel: "結果", vOrder: 7 },

  // 15. ワークライフバランス (5枚)
  { x: 0, y: 0, vLabel: "現状", vOrder: 1 },
  { x: 1, y: 0, vLabel: "仕事・学業", vOrder: 2 },
  { x: 2, y: 0, vLabel: "バランス", vOrder: 3 },
  { x: 3, y: 0, vLabel: "プライベート", vOrder: 4 },
  { x: 4, y: 0, vLabel: "未来", vOrder: 5 },

  // 16. 健康チェック (4枚)
  { x: 0, y: 0, vLabel: "心の健康", vOrder: 1 },
  { x: 1, y: 0, vLabel: "体の健康", vOrder: 2 },
  { x: 2, y: 0, vLabel: "必要な行動", vOrder: 3 },
  { x: 3, y: 0, vLabel: "回復の兆し", vOrder: 4 },

  // 17. 関係性スプレッド (3枚) - 三角形配置
  { x: 1, y: 0, vLabel: "あなた", vOrder: 1 },
  { x: 0, y: 1, vLabel: "相手", vOrder: 2 },
  { x: 2, y: 1, vLabel: "関係性", vOrder: 3 },

  // 18. 関係性ヘルスチェック (6枚)
  { x: 0, y: 0, vLabel: "あなた", vOrder: 1 },
  { x: 1, y: 0, vLabel: "パートナー", vOrder: 2 },
  { x: 2, y: 0, vLabel: "強み", vOrder: 3 },
  { x: 0, y: 1, vLabel: "課題", vOrder: 4 },
  { x: 1, y: 1, vLabel: "アドバイス", vOrder: 5 },
  { x: 2, y: 1, vLabel: "未来", vOrder: 6 },

  // 19. 心のブロック解除 (5枚)
  { x: 0, y: 0, vLabel: "現状", vOrder: 1 },
  { x: 1, y: 0, vLabel: "原因", vOrder: 2 },
  { x: 2, y: 0, vLabel: "ブロック", vOrder: 3 },
  { x: 3, y: 0, vLabel: "解決法", vOrder: 4 },
  { x: 4, y: 0, vLabel: "成功後", vOrder: 5 },

  // 20. ヒーリングジャーニー (6枚)
  { x: 0, y: 0, vLabel: "現在の状態", vOrder: 1 },
  { x: 1, y: 0, vLabel: "根本原因", vOrder: 2 },
  { x: 2, y: 0, vLabel: "治療法", vOrder: 3 },
  { x: 0, y: 1, vLabel: "心の癒し", vOrder: 4 },
  { x: 1, y: 1, vLabel: "体の癒し", vOrder: 5 },
  { x: 2, y: 1, vLabel: "完全回復", vOrder: 6 },

  // 21. エナジーバランス (7枚)
  { x: 0, y: 0, vLabel: "現状", vOrder: 1 },
  { x: 1, y: 0, vLabel: "精神", vOrder: 2 },
  { x: 2, y: 0, vLabel: "肉体", vOrder: 3 },
  { x: 3, y: 0, vLabel: "行動", vOrder: 4 },
  { x: 0, y: 1, vLabel: "栄養", vOrder: 5 },
  { x: 1, y: 1, vLabel: "運動", vOrder: 6 },
  { x: 2, y: 1, vLabel: "バランス", vOrder: 7 },

  // 22. 投資スプレッド (4枚)
  { x: 0, y: 0, vLabel: "リスク", vOrder: 1 },
  { x: 1, y: 0, vLabel: "リターン", vOrder: 2 },
  { x: 2, y: 0, vLabel: "タイミング", vOrder: 3 },
  { x: 3, y: 0, vLabel: "結果", vOrder: 4 },

  // 23. ホースシュー (7枚) - 馬蹄形配置
  { x: 0, y: 0, vLabel: "過去", vOrder: 1 },
  { x: 1, y: 1, vLabel: "現在", vOrder: 2 },
  { x: 2, y: 2, vLabel: "未来", vOrder: 3 },
  { x: 3, y: 3, vLabel: "あなたのアプローチ", vOrder: 4 },
  { x: 4, y: 2, vLabel: "周囲の影響", vOrder: 5 },
  { x: 5, y: 1, vLabel: "障害", vOrder: 6 },
  { x: 6, y: 0, vLabel: "結果", vOrder: 7 },

  // 24. ケルト十字 (10枚) - 十字形＋縦列
  { x: 1, y: 1, vLabel: "現在の状況", vOrder: 1 },
  { x: 1, y: 1, vLabel: "課題・障害", vOrder: 2 },
  { x: 1, y: 2, vLabel: "遠い過去", vOrder: 3 },
  { x: 0, y: 1, vLabel: "近い過去", vOrder: 4 },
  { x: 1, y: 0, vLabel: "可能な未来", vOrder: 5 },
  { x: 2, y: 1, vLabel: "近い未来", vOrder: 6 },
  { x: 4, y: 3, vLabel: "あなたのアプローチ", vOrder: 7 },
  { x: 4, y: 2, vLabel: "周囲の影響", vOrder: 8 },
  { x: 4, y: 1, vLabel: "内面・感情", vOrder: 9 },
  { x: 4, y: 0, vLabel: "最終結果", vOrder: 10 },

  // 25. イヤースプレッド (12枚) - 円形配置（時計のように）
  { x: 2, y: 0, vLabel: "1月", vOrder: 1 },
  { x: 3, y: 0, vLabel: "2月", vOrder: 2 },
  { x: 4, y: 1, vLabel: "3月", vOrder: 3 },
  { x: 4, y: 2, vLabel: "4月", vOrder: 4 },
  { x: 3, y: 3, vLabel: "5月", vOrder: 5 },
  { x: 2, y: 3, vLabel: "6月", vOrder: 6 },
  { x: 1, y: 3, vLabel: "7月", vOrder: 7 },
  { x: 0, y: 2, vLabel: "8月", vOrder: 8 },
  { x: 0, y: 1, vLabel: "9月", vOrder: 9 },
  { x: 1, y: 0, vLabel: "10月", vOrder: 10 },
  { x: 2, y: 1, vLabel: "11月", vOrder: 11 },
  { x: 2, y: 2, vLabel: "12月", vOrder: 12 },

  // 26. アストロロジカルスプレッド (12枚) - 星座環配置
  { x: 1, y: 0, vLabel: "自己", vOrder: 1 },
  { x: 2, y: 0, vLabel: "金銭", vOrder: 2 },
  { x: 3, y: 0, vLabel: "コミュニケーション", vOrder: 3 },
  { x: 4, y: 1, vLabel: "家庭", vOrder: 4 },
  { x: 4, y: 2, vLabel: "創造", vOrder: 5 },
  { x: 3, y: 3, vLabel: "健康", vOrder: 6 },
  { x: 2, y: 4, vLabel: "パートナーシップ", vOrder: 7 },
  { x: 1, y: 4, vLabel: "変化", vOrder: 8 },
  { x: 0, y: 3, vLabel: "哲学", vOrder: 9 },
  { x: 0, y: 2, vLabel: "社会", vOrder: 10 },
  { x: 0, y: 1, vLabel: "友人", vOrder: 11 },
  { x: 1, y: 1, vLabel: "精神", vOrder: 12 },

  // 27. 生命の樹 (10枚) - カバラの生命の樹配置
  { x: 1, y: 0, vLabel: "ケテル", vOrder: 1 },
  { x: 0, y: 1, vLabel: "コクマー", vOrder: 2 },
  { x: 2, y: 1, vLabel: "ビナー", vOrder: 3 },
  { x: 0, y: 2, vLabel: "ケセド", vOrder: 4 },
  { x: 2, y: 2, vLabel: "ゲブラー", vOrder: 5 },
  { x: 1, y: 3, vLabel: "ティファレト", vOrder: 6 },
  { x: 0, y: 4, vLabel: "ネツァク", vOrder: 7 },
  { x: 2, y: 4, vLabel: "ホド", vOrder: 8 },
  { x: 1, y: 5, vLabel: "イエソド", vOrder: 9 },
  { x: 1, y: 6, vLabel: "マルクト", vOrder: 10 },

  // 28. グランドタブロー (36枚) - 6x6グリッド
  { x: 0, y: 0, vLabel: "位置1", vOrder: 1 },
  { x: 1, y: 0, vLabel: "位置2", vOrder: 2 },
  { x: 2, y: 0, vLabel: "位置3", vOrder: 3 },
  { x: 3, y: 0, vLabel: "位置4", vOrder: 4 },
  { x: 4, y: 0, vLabel: "位置5", vOrder: 5 },
  { x: 5, y: 0, vLabel: "位置6", vOrder: 6 },
  { x: 0, y: 1, vLabel: "位置7", vOrder: 7 },
  { x: 1, y: 1, vLabel: "位置8", vOrder: 8 },
  { x: 2, y: 1, vLabel: "位置9", vOrder: 9 },
  { x: 3, y: 1, vLabel: "位置10", vOrder: 10 },
  { x: 4, y: 1, vLabel: "位置11", vOrder: 11 },
  { x: 5, y: 1, vLabel: "位置12", vOrder: 12 },
  { x: 0, y: 2, vLabel: "位置13", vOrder: 13 },
  { x: 1, y: 2, vLabel: "位置14", vOrder: 14 },
  { x: 2, y: 2, vLabel: "位置15", vOrder: 15 },
  { x: 3, y: 2, vLabel: "位置16", vOrder: 16 },
  { x: 4, y: 2, vLabel: "位置17", vOrder: 17 },
  { x: 5, y: 2, vLabel: "位置18", vOrder: 18 },
  { x: 0, y: 3, vLabel: "位置19", vOrder: 19 },
  { x: 1, y: 3, vLabel: "位置20", vOrder: 20 },
  { x: 2, y: 3, vLabel: "位置21", vOrder: 21 },
  { x: 3, y: 3, vLabel: "位置22", vOrder: 22 },
  { x: 4, y: 3, vLabel: "位置23", vOrder: 23 },
  { x: 5, y: 3, vLabel: "位置24", vOrder: 24 },
  { x: 0, y: 4, vLabel: "位置25", vOrder: 25 },
  { x: 1, y: 4, vLabel: "位置26", vOrder: 26 },
  { x: 2, y: 4, vLabel: "位置27", vOrder: 27 },
  { x: 3, y: 4, vLabel: "位置28", vOrder: 28 },
  { x: 4, y: 4, vLabel: "位置29", vOrder: 29 },
  { x: 5, y: 4, vLabel: "位置30", vOrder: 30 },
  { x: 0, y: 5, vLabel: "位置31", vOrder: 31 },
  { x: 1, y: 5, vLabel: "位置32", vOrder: 32 },
  { x: 2, y: 5, vLabel: "位置33", vOrder: 33 },
  { x: 3, y: 5, vLabel: "位置34", vOrder: 34 },
  { x: 4, y: 5, vLabel: "位置35", vOrder: 35 },
  { x: 5, y: 5, vLabel: "位置36", vOrder: 36 },
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
  const dataLines = tableLines.slice(1);

  const spreads = [];

  const copyCells = cells.map((cell) => ({ ...cell }));

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
      cells: copyCells.splice(0, parseInt(cardCount, 10)),
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
        cells: { create: spreadData.cells || [] },
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
