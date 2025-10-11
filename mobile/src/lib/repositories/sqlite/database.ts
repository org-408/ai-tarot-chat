import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from "@capacitor-community/sqlite";

/**
 * SQLite Database Manager (Capacitor版)
 * 
 * @capacitor-community/sqliteを使用したデータベース管理
 * Prisma Clientの代替としてSQLiteConnectionを管理
 */
class DatabaseManager {
  private static instance: SQLiteConnection | null = null;
  private static db: SQLiteDBConnection | null = null;
  
  // データベース名を環境に応じて設定
  private static readonly DB_NAME = "tarot_app.db";
  private static readonly DB_VERSION = 1;

  /**
   * SQLiteConnectionインスタンスを取得（シングルトン）
   */
  static async getInstance(): Promise<SQLiteConnection> {
    if (!this.instance) {
      this.instance = new SQLiteConnection(CapacitorSQLite);
    }
    return this.instance;
  }

  /**
   * データベース接続を取得
   * データベースが存在しない場合は作成し、開く
   */
  static async getDB(): Promise<SQLiteDBConnection> {
    if (!this.db) {
      const sqlite = await this.getInstance();
      
      // データベースを作成または開く
      this.db = await sqlite.createConnection(
        this.DB_NAME,
        false, // encrypted
        "no-encryption", // mode
        this.DB_VERSION,
        false // readOnly
      );
      
      // データベースを開く
      await this.db.open();
    }
    return this.db;
  }

  /**
   * データベース接続を閉じる
   */
  static async disconnect(): Promise<void> {
    if (this.db) {
      try {
        await this.db.close();
        this.db = null;
      } catch (error) {
        console.error("Failed to close database:", error);
      }
    }
    
    if (this.instance) {
      // SQLiteConnectionのクリーンアップ
      this.instance = null;
    }
  }

  /**
   * データベース接続を取得（エイリアス）
   * Prismaの`prisma`と同様の使い方を提供
   */
  static get sqlite(): Promise<SQLiteDBConnection> {
    return this.getDB();
  }
}

// エクスポート
export const getDB = () => DatabaseManager.getDB();
export { DatabaseManager };
