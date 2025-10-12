/**
 * SQLite Database Setup for Offline Support
 *
 * Capacitor SQLite を使用したオフラインデータベース管理
 * @capacitor-community/sqlite を使用
 */

import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from "@capacitor-community/sqlite";
import { Capacitor } from "@capacitor/core";

// jeep-sqliteのカスタム要素の型定義を追加
interface JeepSQLiteElement extends HTMLElement {
  initWebStore: () => Promise<void>;
}

const DB_NAME = "tarot_offline.db";
const DB_VERSION = 1;

let sqliteConnection: SQLiteConnection | null = null;
let db: SQLiteDBConnection | null = null;

/**
 * SQLite接続を初期化
 */
export async function initSQLite(): Promise<SQLiteDBConnection> {
  if (db) {
    return db;
  }

  try {
    // プラットフォームチェック
    const platform = Capacitor.getPlatform();

    if (platform === "web") {
      // Web版は jeep-sqlite を使用
      const jeepSqlite = document.createElement(
        "jeep-sqlite"
      ) as JeepSQLiteElement;
      document.body.appendChild(jeepSqlite);
      await customElements.whenDefined("jeep-sqlite");
      await jeepSqlite.initWebStore();
    }

    // SQLite接続を作成
    sqliteConnection = new SQLiteConnection(CapacitorSQLite);

    // データベースを開く
    db = await sqliteConnection.createConnection(
      DB_NAME,
      false, // encrypted
      "no-encryption",
      DB_VERSION,
      false // readonly
    );

    await db.open();

    // スキーマを初期化
    await initializeSchema();

    console.log("✅ SQLite initialized successfully");
    return db;
  } catch (error) {
    console.error("❌ Failed to initialize SQLite:", error);
    throw error;
  }
}

/**
 * データベーススキーマを初期化
 */
async function initializeSchema(): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  const schemas = [
    // Plans テーブル
    `CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      no INTEGER NOT NULL,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL,
      requiresAuth INTEGER NOT NULL,
      features TEXT NOT NULL,
      isActive INTEGER NOT NULL,
      maxReadings INTEGER NOT NULL,
      maxCeltics INTEGER NOT NULL,
      maxPersonal INTEGER NOT NULL,
      hasPersonal INTEGER NOT NULL,
      hasHistory INTEGER NOT NULL,
      primaryColor TEXT NOT NULL,
      secondaryColor TEXT NOT NULL,
      accentColor TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`,

    // SpreadLevels テーブル
    `CREATE TABLE IF NOT EXISTS spread_levels (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`,

    // Categories テーブル
    `CREATE TABLE IF NOT EXISTS reading_categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`,

    // Tarotists テーブル
    `CREATE TABLE IF NOT EXISTS tarotists (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      icon TEXT NOT NULL,
      trait TEXT NOT NULL,
      bio TEXT NOT NULL,
      provider TEXT,
      quality INTEGER NOT NULL,
      "order" INTEGER NOT NULL,
      planId TEXT NOT NULL,
      primaryColor TEXT NOT NULL,
      secondaryColor TEXT NOT NULL,
      accentColor TEXT NOT NULL,
      avatarUrl TEXT,
      cost TEXT NOT NULL,
      deletedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (planId) REFERENCES plans(id)
    )`,

    // Spreads テーブル
    `CREATE TABLE IF NOT EXISTS spreads (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      guide TEXT,
      planId TEXT NOT NULL,
      levelId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (planId) REFERENCES plans(id),
      FOREIGN KEY (levelId) REFERENCES spread_levels(id)
    )`,

    // SpreadCells テーブル
    `CREATE TABLE IF NOT EXISTS spread_cells (
      id TEXT PRIMARY KEY,
      spreadId TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      vLabel TEXT,
      hLabel TEXT,
      vOrder INTEGER,
      hOrder INTEGER,
      FOREIGN KEY (spreadId) REFERENCES spreads(id)
    )`,

    // SpreadToCategory 中間テーブル
    `CREATE TABLE IF NOT EXISTS spread_to_category (
      id TEXT PRIMARY KEY,
      spreadId TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      FOREIGN KEY (spreadId) REFERENCES spreads(id),
      FOREIGN KEY (categoryId) REFERENCES reading_categories(id),
      UNIQUE(spreadId, categoryId)
    )`,

    // MasterConfig テーブル
    `CREATE TABLE IF NOT EXISTS master_config (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      version TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`,

    // TarotDecks テーブル
    `CREATE TABLE IF NOT EXISTS tarot_decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      purpose TEXT NOT NULL,
      totalCards INTEGER NOT NULL,
      sources TEXT NOT NULL,
      optimizedFor TEXT NOT NULL,
      primaryFocus TEXT NOT NULL,
      categories TEXT NOT NULL,
      status TEXT NOT NULL,
      language TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`,

    // TarotCards テーブル
    `CREATE TABLE IF NOT EXISTS tarot_cards (
      id TEXT PRIMARY KEY,
      no INTEGER NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      number INTEGER NOT NULL,
      suit TEXT,
      element TEXT,
      zodiac TEXT,
      uprightKeywords TEXT NOT NULL,
      reversedKeywords TEXT NOT NULL,
      promptContext TEXT NOT NULL,
      language TEXT NOT NULL,
      deckId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (deckId) REFERENCES tarot_decks(id)
    )`,

    // CardMeanings テーブル
    `CREATE TABLE IF NOT EXISTS card_meanings (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      upright TEXT NOT NULL,
      reversed TEXT NOT NULL,
      cardId TEXT NOT NULL,
      language TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (cardId) REFERENCES tarot_cards(id)
    )`,

    // インデックス作成
    `CREATE INDEX IF NOT EXISTS idx_spreads_planId ON spreads(planId)`,
    `CREATE INDEX IF NOT EXISTS idx_spreads_levelId ON spreads(levelId)`,
    `CREATE INDEX IF NOT EXISTS idx_spread_cells_spreadId ON spread_cells(spreadId)`,
    `CREATE INDEX IF NOT EXISTS idx_tarotists_planId ON tarotists(planId)`,
    `CREATE INDEX IF NOT EXISTS idx_spread_to_category_spreadId ON spread_to_category(spreadId)`,
    `CREATE INDEX IF NOT EXISTS idx_spread_to_category_categoryId ON spread_to_category(categoryId)`,
    `CREATE INDEX IF NOT EXISTS idx_tarot_cards_deckId ON tarot_cards(deckId)`,
    `CREATE INDEX IF NOT EXISTS idx_card_meanings_cardId ON card_meanings(cardId)`,
  ];

  for (const schema of schemas) {
    await db.execute(schema);
  }

  console.log("✅ Database schema initialized");
}

/**
 * データベース接続を取得
 */
export async function getDatabase(): Promise<SQLiteDBConnection> {
  if (!db) {
    return await initSQLite();
  }
  return db;
}

/**
 * データベースを閉じる
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
  if (sqliteConnection) {
    await sqliteConnection.closeConnection(DB_NAME, false);
  }
}

/**
 * データベースをリセット（開発用）
 */
export async function resetDatabase(): Promise<void> {
  if (sqliteConnection) {
    try {
      await sqliteConnection.closeConnection(DB_NAME, false);
      const isExists = await sqliteConnection.isConnection(DB_NAME, false);
      if (isExists.result) {
        await sqliteConnection.closeConnection(DB_NAME, false);
      }
      db = null;
      await initSQLite();
      console.log("✅ Database reset successfully");
    } catch (error) {
      console.error("❌ Failed to reset database:", error);
      throw error;
    }
  }
}
