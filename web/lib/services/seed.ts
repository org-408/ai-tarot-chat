import type {
  CardMeaningInput,
  PlanInput,
  SpreadCellInput,
  SpreadInput,
  SpreadLevelInput,
  SpreadWithLevelPlanCategories,
  TarotCardInput,
  TarotDeckInput,
  TarotistWithPlanCode,
} from "@/../shared/lib/types";
import fs from "fs";
import path from "path";
import {
  BaseRepository,
  planRepository,
  spreadRepository,
  tarotistRepository,
  tarotRepository,
} from "../repositories";
import { masterConfigRepository } from "../repositories/master";

// SpreadデータのCSVインターフェース
type SpreadCsv = SpreadInput & {
  planCode: string;
  levelCode: string;
  categories: string[];
  cardCount: number;
};

// タロットデータの型定義
export interface TarotDictionary {
  metadata: TarotMetadata;
  cards: Record<string, TarotCard>;
}

export interface TarotMetadata {
  version: string;
  purpose: string;
  totalCards: number;
  sources: string[];
  optimizedFor: string;
  primaryFocus: string;
  categories: string[];
  updated: string;
  status: string;
}

export interface TarotCard {
  name: string;
  type: string;
  number: number;
  suit: string | null;
  element: string | null;
  zodiac: string | null;
  uprightKeywords: string[];
  reversedKeywords: string[];
  meanings: Record<string, TarotMeaning>;
  promptContext: string;
}

export interface TarotMeaning {
  upright: string;
  reversed: string;
}

export class SeedService {
  /**
   * CSVデータを取得するユーティリティ関数
   * docs フォルダから取得する
   */
  getCSVData(fileName: string, folder: string = "docs"): string[] {
    const filePath = path.join(__dirname, "..", folder, fileName);
    const data = fs.readFileSync(filePath, "utf-8");
    return data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);
  }

  /**
   * JSONファイルからデータを読み込む汎用的な関数
   *
   * @param fileName JSONファイル名
   * @param folder フォルダパス
   * @returns パースされたJSONデータ
   */
  getJSONData<T>(fileName: string, folder: string = "docs"): T {
    const filePath = path.join(__dirname, "..", "..", "..", folder, fileName);
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data) as T;
  }

  /**
   * CSVファイルからデータを読み込み、指定された型の配列として返す
   * @param fileName CSVファイル名
   * @param options オプション設定
   *   - arrays: 配列に変換するフィールド名の配列
   *   - folder: CSVファイルのフォルダパス
   *   - copies: フィールドのコピー設定 { fromField: toField }
   * @returns T型の配列
   *
   * CSV仕様:
   * - 1行目はフィールド名
   * - // で始まる行はコメント
   * - 配列要素は ; で区切る
   * - カンマ区切りで値を指定
   */
  getDBData<T>(
    fileName: string,
    options: {
      arrays?: string[];
      folder?: string;
      copies?: Record<string, string>;
    } = {}
  ): T[] {
    const arrays = options.arrays || ["features", "categories", "tags"];
    const folder = options.folder || "../../docs";
    const copies = options.copies || { categories: "category" };

    // CSVデータを取得
    const lines = this.getCSVData(fileName, folder);

    if (lines.length === 0) {
      return [];
    }

    // コメント行を除外
    const validLines = lines.filter((line) => !line.startsWith("//"));

    if (validLines.length === 0) {
      return [];
    }

    // ヘッダー行からフィールド名を取得
    const headers = validLines[0].split(",").map((header) => header.trim());

    // データ行を処理
    const result: T[] = [];

    for (let i = 1; i < validLines.length; i++) {
      const line = validLines[i];
      const values = line.split(",").map((value) => value.trim());

      // 各フィールドの値を適切な型に変換
      const item: Record<string, unknown> = {};

      // まずは生の値をすべて格納
      for (let j = 0; j < headers.length && j < values.length; j++) {
        const fieldName = headers[j];
        const rawValue = values[j];

        // 値がない場合はスキップ
        if (rawValue === undefined || rawValue === "") {
          continue;
        }

        // まず生の値を格納
        item[fieldName] = rawValue;
      }

      // フィールドのコピー処理 (生の値をコピー)
      for (const [fromField, toField] of Object.entries(copies)) {
        if (fromField in item) {
          item[toField] = item[fromField];
        }
      }

      // 値の変換処理（コピー後に実行）
      for (const fieldName of headers) {
        if (fieldName in item && typeof item[fieldName] === "string") {
          // 文字列値のみ変換処理
          item[fieldName] = this.convertValueByFieldName(
            item[fieldName] as string,
            fieldName,
            arrays
          );
        }
      }

      result.push(item as T);
    }

    return result;
  }

  /**
   * フィールド名に基づいて値を適切な型に変換する
   */
  private convertValueByFieldName(
    value: string,
    fieldName: string,
    arrays: string[]
  ): unknown {
    // 空値チェック
    if (!value || value.trim() === "") {
      return undefined;
    }

    // 真偽値の変換
    if (value === "true") return true;
    if (value === "false") return false;

    // 配列フィールドの変換（セミコロンまたはスラッシュ区切り）
    if (
      arrays.some((pattern) => fieldName.toLowerCase().includes(pattern)) ||
      value.includes(";")
    ) {
      // 「;」で分割
      return value
        .split(/[;]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    // 数値フィールドの変換
    const numberFieldPatterns = [
      "count",
      "price",
      "number",
      "order",
      "max",
      "min",
      "limit",
    ];

    if (
      numberFieldPatterns.some((pattern) =>
        fieldName.toLowerCase().includes(pattern)
      ) ||
      /^-?\d+(\.\d+)?$/.test(value)
    ) {
      return Number(value);
    }

    // 日付フィールドの変換
    const dateFieldPatterns = [
      "date",
      "at",
      "time",
      "created",
      "updated",
      "deleted",
    ];

    if (
      dateFieldPatterns.some((pattern) =>
        fieldName.toLowerCase().includes(pattern)
      ) &&
      /^\d{4}-\d{2}-\d{2}/.test(value)
    ) {
      return new Date(value);
    }

    // JSONオブジェクトの変換
    if (
      (value.startsWith("{") && value.endsWith("}")) ||
      (value.startsWith("[") && value.endsWith("]"))
    ) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.error("JSON parse error:", e);
        // パースに失敗した場合は文字列として扱う
        return value;
      }
    }

    // それ以外は文字列として扱う
    return value;
  }

  /**
   * Planデータを取得
   */
  getPlanData(): PlanInput[] {
    return this.getDBData<PlanInput>("plans_data.csv");
  }

  /**
   * SpreadLevelデータを取得
   */
  getSpreadLevelData(): SpreadLevelInput[] {
    return this.getDBData<SpreadLevelInput>("levels_data.csv");
  }

  /**
   * Tarotistデータを取得
   */
  getTarotistData(): TarotistWithPlanCode[] {
    return this.getDBData<TarotistWithPlanCode>("tarotists_data.csv").map(
      (tarotist, index) => {
        const { order, ...rest } = tarotist;

        return {
          order: index + 1 || order,
          ...rest,
        };
      }
    );
  }

  /**
   * Spreadデータを取得
   */
  getSpreadData(): SpreadWithLevelPlanCategories[] {
    const spreads = this.getDBData<SpreadCsv>("spreads_data.csv");
    const cells = this.getDBData<SpreadCellInput>("cells_data.csv");
    let index = 0;
    return spreads.map((spread) => {
      const { cardCount, ...spreadRest } = spread;
      const spreadCells = cells.slice(index, index + cardCount);
      index += cardCount;
      return {
        ...spreadRest,
        cells: spreadCells,
      };
    });
  }

  /**
   * TarotDeck, TarotCard データを取得
   */
  getTarotDeckData(): TarotDeckInput[] {
    const result: TarotDeckInput[] = [];
    const languages = ["ja", "en"];
    const names = ["標準デッキ", "Standard Deck"];

    // 言語ごとにデッキデータを取得
    let lindex = 0;
    for (const language of languages) {
      const deck = this.getJSONData<TarotDictionary>(
        `tarot_data_dictionary_${language}.json`
      );

      if (deck) {
        // タロット辞書データの分解
        const { metadata, cards } = deck as TarotDictionary;

        // カードデータを変換
        const cardsInput: TarotCardInput[] = Object.entries(cards).map(
          ([code, card], index) => {
            // meaningはオブジェクトなのでObjectEntriesを使う
            const meaningsArray: CardMeaningInput[] = Object.entries(
              card.meanings || {}
            ).map(([category, meaning]) => ({
              category,
              upright: meaning.upright,
              reversed: meaning.reversed,
              language,
            }));

            return {
              no: index + 1,
              code,
              name: card.name,
              type: card.type,
              number: card.number,
              suit: card.suit,
              element: card.element,
              zodiac: card.zodiac,
              uprightKeywords: card.uprightKeywords || [],
              reversedKeywords: card.reversedKeywords || [],
              promptContext: card.promptContext || "",
              language,
              meanings: meaningsArray,
            };
          }
        );

        // デッキデータを作成
        const deckInput: TarotDeckInput = {
          name: names[lindex++],
          version: metadata.version,
          purpose: metadata.purpose,
          totalCards: metadata.totalCards,
          sources: metadata.sources,
          optimizedFor: metadata.optimizedFor,
          primaryFocus: metadata.primaryFocus,
          categories: metadata.categories,
          status: metadata.status,
          language,
          cards: cardsInput,
        };

        result.push(deckInput);
      }
    }
    return result;
  }

  /**
   * データをシードするメイン関数
   * 他のサービスから呼び出す
   */
  async seedDatabase() {
    console.log("Starting database seeding...");

    BaseRepository.transaction(
      {
        planRepo: planRepository,
        spreadRepo: spreadRepository,
        tarotistRepo: tarotistRepository,
        tarotRepo: tarotRepository,
        masterConfigRepo: masterConfigRepository,
      },
      async ({
        planRepo,
        spreadRepo,
        tarotistRepo,
        tarotRepo,
        masterConfigRepo,
      }) => {
        // Planデータのシード
        const plans = this.getPlanData();
        for (const plan of plans) {
          await planRepo.createPlan(plan);
        }
        console.log(`Seeded ${plans.length} plans.`);

        // SpreadLevelデータのシード
        const levels = this.getSpreadLevelData();
        for (const level of levels) {
          await spreadRepo.createSpreadLevel(level);
        }
        console.log(`Seeded ${levels.length} spread levels.`);

        // Tarotistデータのシード
        const tarotists = this.getTarotistData();
        for (const tarotist of tarotists) {
          await tarotistRepo.createTarotistWithPlanCode(tarotist);
        }
        console.log(`Seeded ${tarotists.length} tarotists.`);

        // Spreadデータのシード
        const spreads = this.getSpreadData();
        for (const spread of spreads) {
          const { cells, ...rest } = spread;
          await spreadRepo.createSpreadWithLevelPlanCategories(
            rest as SpreadWithLevelPlanCategories,
            cells
          );
        }
        console.log(`Seeded ${spreads.length} spreads.`);

        // TarotDeck, TarotCard データのシード
        const decks = this.getTarotDeckData();
        for (const deck of decks) {
          await tarotRepo.createDeck(deck);
        }
        console.log(`Seeded ${decks.length} tarot decks with cards.`);

        // マスターバージョンデータのシード
        await masterConfigRepo.createMasterConfig({
          key: "MASTER_VERSION",
          version: "1.0.0",
          description: "Initial master data version",
        });
        console.log("Seeded master configuration.");

        // 全データのシード完了
        console.log("Database seeding completed.");
      }
    );
  }
}

export const seedService = new SeedService();
