import { Prisma, PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// プランの作成
const plans: Prisma.PlanCreateInput[] = [
  {
    code: "GUEST",
    name: "ゲスト",
    description: "簡単なタロットリーディングを無料で体験",
    price: 0,
    features: [
      "ユーザー登録なしでお気軽に体験",
      "1日1回のみ利用可能",
      "基本スプレッド(3種類)",
      "恋愛・仕事・今日の運勢",
      "広告表示あり",
    ],
    maxReadings: 1,
  },
  {
    code: "FREE",
    name: "フリー",
    description: "占い回数が少し増え、占った履歴も残せます",
    price: 0,
    features: [
      "ユーザー登録でさらに楽しめます",
      "1日3回まで利用可能",
      "占い履歴を保存可能",
      "基本スプレッド(3種類)",
      "恋愛・仕事・今日の運勢",
      "広告表示あり",
    ],
    maxReadings: 3,
    hasHistory: true,
  },
  {
    code: "STANDARD",
    name: "スタンダード",
    description: "多彩な占いカテゴリとスプレッドを体験。広告なしで快適に",
    price: 480,
    features: [
      "多彩な占いカテゴリ",
      "1日3回7枚以内スプレッドが利用可能",
      "または、1日1回ケルト十字が利用可能",
      "占い履歴を保存可能",
      "広告表示なし",
    ],
    maxReadings: 3,
    maxCeltics: 1,
    hasHistory: true,
  },
  {
    code: "PREMIUM",
    name: "プレミアム",
    description: "占う内容の入力と詳細な解説、簡単な対話を提供",
    price: 980,
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
  },
  {
    code: "MASTER",
    name: "マスター",
    description: "詳細な解説と全スプレッド、詳細な対話を提供",
    price: 1980,
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

  // 4. 3枚引き（Mind/Body/Spirit）(3枚)
  { x: 0, y: 0, vLabel: "心", vOrder: 1 },
  { x: 1, y: 0, vLabel: "体", vOrder: 2 },
  { x: 2, y: 0, vLabel: "魂", vOrder: 3 },

  // 5. 恋愛三角 (3枚) - 三角形配置
  { x: 1, y: 0, vLabel: "心の状態", vOrder: 1 },
  { x: 0, y: 1, vLabel: "現在の愛", vOrder: 2 },
  { x: 2, y: 1, vLabel: "未来の愛", vOrder: 3 },

  // 6. 面接スプレッド (3枚)
  { x: 0, y: 0, vLabel: "あなたの強み", vOrder: 1 },
  { x: 1, y: 0, vLabel: "相手の印象", vOrder: 2 },
  { x: 2, y: 0, vLabel: "結果", vOrder: 3 },

  // 7. 関係性スプレッド (3枚) - 三角形配置
  { x: 1, y: 0, vLabel: "あなた", vOrder: 1 },
  { x: 0, y: 1, vLabel: "相手", vOrder: 2 },
  { x: 2, y: 1, vLabel: "関係性", vOrder: 3 },

  // 8. 復縁スプレッド (4枚)
  { x: 0, y: 0, vLabel: "過去の関係", vOrder: 1 },
  { x: 1, y: 0, vLabel: "現在の状況", vOrder: 2 },
  { x: 2, y: 0, vLabel: "相手の気持ち", vOrder: 3 },
  { x: 3, y: 0, vLabel: "復縁可能性", vOrder: 4 },

  // 9. 健康チェック (4枚)
  { x: 0, y: 0, vLabel: "心の健康", vOrder: 1 },
  { x: 1, y: 0, vLabel: "体の健康", vOrder: 2 },
  { x: 2, y: 0, vLabel: "必要な行動", vOrder: 3 },
  { x: 3, y: 0, vLabel: "回復の兆し", vOrder: 4 },

  // 10. 投資スプレッド (4枚)
  { x: 0, y: 0, vLabel: "リスク", vOrder: 1 },
  { x: 1, y: 0, vLabel: "リターン", vOrder: 2 },
  { x: 2, y: 0, vLabel: "タイミング", vOrder: 3 },
  { x: 3, y: 0, vLabel: "結果", vOrder: 4 },

  // 11. 5枚スプレッド (5枚) - 十字配置
  { x: 1, y: 0, vLabel: "現在", vOrder: 1 },
  { x: 0, y: 1, vLabel: "過去", vOrder: 2 },
  { x: 1, y: 1, vLabel: "課題", vOrder: 3 },
  { x: 2, y: 1, vLabel: "未来", vOrder: 4 },
  { x: 1, y: 2, vLabel: "アドバイス", vOrder: 5 },

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

  // 14. 心のブロック解除 (5枚)
  { x: 0, y: 0, vLabel: "現状", vOrder: 1 },
  { x: 1, y: 0, vLabel: "原因", vOrder: 2 },
  { x: 2, y: 0, vLabel: "ブロック", vOrder: 3 },
  { x: 3, y: 0, vLabel: "解決法", vOrder: 4 },
  { x: 4, y: 0, vLabel: "成功後", vOrder: 5 },

  // 15. ワークライフバランス (5枚)
  { x: 0, y: 0, vLabel: "現状", vOrder: 1 },
  { x: 1, y: 0, vLabel: "仕事・学業", vOrder: 2 },
  { x: 2, y: 0, vLabel: "バランス", vOrder: 3 },
  { x: 3, y: 0, vLabel: "プライベート", vOrder: 4 },
  { x: 4, y: 0, vLabel: "未来", vOrder: 5 },

  // 16. 金運予測 (6枚)
  { x: 0, y: 0, vLabel: "現在の状況", vOrder: 1 },
  { x: 1, y: 0, vLabel: "収入", vOrder: 2 },
  { x: 2, y: 0, vLabel: "支出", vOrder: 3 },
  { x: 0, y: 1, vLabel: "投資運", vOrder: 4 },
  { x: 1, y: 1, vLabel: "節約法", vOrder: 5 },
  { x: 2, y: 1, vLabel: "金運", vOrder: 6 },

  // 17. 関係性ヘルスチェック (6枚)
  { x: 0, y: 0, vLabel: "あなた", vOrder: 1 },
  { x: 1, y: 0, vLabel: "パートナー", vOrder: 2 },
  { x: 2, y: 0, vLabel: "強み", vOrder: 3 },
  { x: 0, y: 1, vLabel: "課題", vOrder: 4 },
  { x: 1, y: 1, vLabel: "アドバイス", vOrder: 5 },
  { x: 2, y: 1, vLabel: "未来", vOrder: 6 },

  // 18. ヒーリングジャーニー (6枚)
  { x: 0, y: 0, vLabel: "現在の状態", vOrder: 1 },
  { x: 1, y: 0, vLabel: "根本原因", vOrder: 2 },
  { x: 2, y: 0, vLabel: "治療法", vOrder: 3 },
  { x: 0, y: 1, vLabel: "心の癒し", vOrder: 4 },
  { x: 1, y: 1, vLabel: "体の癒し", vOrder: 5 },
  { x: 2, y: 1, vLabel: "完全回復", vOrder: 6 },

  // 19. キャリアパス (7枚)
  { x: 0, y: 0, vLabel: "現状", vOrder: 1 },
  { x: 1, y: 0, vLabel: "課題", vOrder: 2 },
  { x: 2, y: 0, vLabel: "強み", vOrder: 3 },
  { x: 3, y: 0, vLabel: "長期目標", vOrder: 4 },
  { x: 0, y: 1, vLabel: "行動", vOrder: 5 },
  { x: 1, y: 1, vLabel: "機会", vOrder: 6 },
  { x: 2, y: 1, vLabel: "結果", vOrder: 7 },

  // 20. エナジーバランス (7枚)
  { x: 0, y: 0, vLabel: "現状", vOrder: 1 },
  { x: 1, y: 0, vLabel: "精神", vOrder: 2 },
  { x: 2, y: 0, vLabel: "肉体", vOrder: 3 },
  { x: 3, y: 0, vLabel: "行動", vOrder: 4 },
  { x: 0, y: 1, vLabel: "栄養", vOrder: 5 },
  { x: 1, y: 1, vLabel: "運動", vOrder: 6 },
  { x: 2, y: 1, vLabel: "バランス", vOrder: 7 },

  // 21. ホースシュー (7枚) - 馬蹄形配置
  { x: 0, y: 0, vLabel: "過去", vOrder: 1 },
  { x: 0, y: 1, vLabel: "現在", vOrder: 2 },
  { x: 1, y: 2, vLabel: "隠れた影響", vOrder: 3 },
  { x: 2, y: 3, vLabel: "あなたのアプローチ", vOrder: 4 },
  { x: 3, y: 2, vLabel: "周囲の影響", vOrder: 5 },
  { x: 4, y: 1, vLabel: "すべきこと", vOrder: 6 },
  { x: 4, y: 0, vLabel: "結果", vOrder: 7 },

  // 22. ケルト十字 (10枚) - 十字形＋縦列
  { x: 1, y: 1, vLabel: "現在の状況", vOrder: 1 },
  { x: 1, y: 1, hLabel: "課題・障害", hOrder: 2 },
  { x: 1, y: 0, vLabel: "理想・目標", vOrder: 3 },
  { x: 1, y: 2, vLabel: "潜在意識", vOrder: 4 },
  { x: 2, y: 1, vLabel: "過去の影響", vOrder: 5 },
  { x: 0, y: 1, vLabel: "近い未来", vOrder: 6 },
  { x: 4, y: 3, vLabel: "あなたのアプローチ", vOrder: 7 },
  { x: 4, y: 2, vLabel: "周囲の影響", vOrder: 8 },
  { x: 4, y: 1, vLabel: "希望・恐れ", vOrder: 9 },
  { x: 4, y: 0, vLabel: "最終結果", vOrder: 10 },

  // 23. イヤースプレッド (12枚) - 円形配置（時計のように）
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

  // 24. アストロロジカルスプレッド (12枚) - 星座環配置
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

  // 25. 生命の樹 (10枚) - カバラの生命の樹配置
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

  // 26. グランドタブロー (36枚) - 6x6グリッド
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

const tarotists: Prisma.TarotistCreateInput[] = [
  {
    name: "Ariadne",
    bio: "経験豊富なタロットリーダーで、深い洞察力を持つ",
    avatarUrl: "/images/ariadne.webp",
  },
];

// プラン名を正規化する関数
function normalizePlan(plan: string): string {
  const planMap: Record<string, string> = {
    Guest: "GUEST",
    Free: "FREE",
    Standard: "STANDARD",
    Master: "MASTER",
  };
  return planMap[plan] || "GUEST";
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

// CSVのテーブルを解析してスプレッドデータを抽出する関数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseCsvTable(csvContent: string): Promise<any[]> {
  const lines = csvContent.split("\n");
  // ヘッダー行を除外
  const dataLines = lines.slice(1);

  const spreads = [];

  const copyCells = cells.map((cell) => ({ ...cell }));

  for (const line of dataLines) {
    const columns = line
      .split(",")
      .map((col) => col.trim())
      .filter(Boolean);

    const [
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      number,
      name,
      code,
      cardCount,
      categoryString,
      level,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      meanings,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      popularity,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      practicality,
      plan,
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
      cells: copyCells.splice(0, parseInt(cardCount, 10)),
    };

    spreads.push(spreadData);
  }

  return spreads;
}

async function importSpreads() {
  try {
    console.log("🌱 スプレッドデータのインポートを開始します...");

    // CSVファイルの読み込み
    const mdPath = path.join(
      __dirname,
      "..",
      "..",
      "docs",
      "tarot-spreads-matrix.csv"
    );
    const csvContent = fs.readFileSync(mdPath, "utf-8");

    // CSVを解析してスプレッドデータを抽出
    const spreads = await parseCsvTable(csvContent);

    for (const spreadData of spreads) {
      const update = {
        name: spreadData.name.trim(),
        category: spreadData.categoryString.trim(),
        level: { connect: { code: spreadData.level } },
        plan: { connect: { code: spreadData.plan } },
        guide: spreadData.guide,
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

// カードデータの型を定義
interface CardData {
  prompt_context: string;
  name: string;
  type: string;
  number: string;
  suit: string;
  element: string;
  zodiac: string;
  meanings: Record<string, { upright: string; reversed: string }>;
  upright_keywords: string[];
  reversed_keywords: string[];
}

// タロットデータのインポート
async function importTarotDeck() {
  try {
    // JSONファイルの読み込み
    const jsonPath = path.join(
      __dirname,
      "..",
      "..",
      "docs",
      "tarot_data_dictionary.json"
    );
    const tarotData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    // タロットデッキの作成
    const deck = await prisma.tarotDeck.create({
      data: {
        name: "標準タロットデッキ",
        version: tarotData.metadata.version,
        purpose: tarotData.metadata.purpose,
        totalCards: tarotData.metadata.total_cards,
        sources: tarotData.metadata.sources,
        optimizedFor: tarotData.metadata.optimized_for,
        primaryFocus: tarotData.metadata.primary_focus,
        categories: tarotData.metadata.categories,
        status: tarotData.metadata.status,
      },
    });

    console.log(`タロットデッキを作成しました: ${deck.name}`);

    // カードの作成
    let count = 1;
    for (const [cardId, cardData] of Object.entries(tarotData.cards) as [
      string,
      CardData
    ][]) {
      // カードを作成
      await prisma.tarotCard.create({
        data: {
          no: count++,
          code: cardId,
          name: cardData.name,
          type: cardData.type,
          number: parseInt(cardData.number, 10),
          suit: cardData.suit,
          element: cardData.element,
          zodiac: cardData.zodiac,
          uprightKeywords: cardData.upright_keywords || [],
          reversedKeywords: cardData.reversed_keywords || [],
          promptContext: cardData.prompt_context,
          deckId: deck.id,
          // meanings を CardMeaning の形式に変換して作成
          meanings: {
            create: Object.entries(cardData.meanings || {}).map(
              ([category, data]) => ({
                category,
                upright: data.upright,
                reversed: data.reversed,
              })
            ),
          },
        },
        include: {
          meanings: true,
        },
      });
    }

    console.log(
      `${Object.keys(tarotData.cards).length}枚のカードをインポートしました`
    );
  } catch (error) {
    console.error("タロットデータのインポート中にエラーが発生しました:", error);
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

  // tarotists
  for (const tarotist of tarotists) {
    await prisma.tarotist.create({ data: tarotist });
  }

  await importSpreads();

  await importTarotDeck();

  console.log("Seeding completed.");
}

main();
